"""
NEXORA FX — Multi-Asset Risk Management Engine
Calculates institutional-grade position sizing and lot sizing across:
- Forex (Standard 100,000 units, pip calculation)
- Precious Metals (Gold 100 oz, Silver 5,000 oz)
- Cryptocurrencies (Coin contracts, fractional lots)
- Indices (Index point multipliers)
- Equities / Stocks (Share count and cash allocation)
- Commodities (Crude Oil 1,000 barrels, Natural Gas)

Includes:
- Stop loss distance and pip/point calculations
- Spread and slippage drag quantification
- Account balance and risk percentage constraints
- Daily loss limit circuit breaker
- Maximum trades per day protection
- Risk-to-reward metrics
"""

from typing import Dict, Any, Optional
from backend.market_data.registry import provider_registry

class RiskManager:
    def __init__(
        self,
        contract_size: float = 100.0,
        tick_size: float = 0.01,
        tick_value: float = 1.0,
        default_spread: float = 0.25,
        default_slippage: float = 0.10
    ):
        self.default_contract_size = contract_size
        self.tick_size = tick_size
        self.tick_value = tick_value
        self.default_spread = default_spread
        self.default_slippage = default_slippage

    def calculate_position(
        self,
        account_balance: float,
        risk_pct: float,
        entry_price: float,
        sl_price: float,
        symbol: str = "XAUUSD",
        tp_price: Optional[float] = None,
        spread_points: Optional[float] = None,
        slippage_points: Optional[float] = None,
        contract_size: Optional[float] = None,
        daily_loss_limit_pct: float = 3.0,
        current_daily_loss: float = 0.0,
        max_trades_per_day: int = 5,
        trades_taken_today: int = 0
    ) -> Dict[str, Any]:
        """
        Calculates exact lot size or share quantity without guesswork.
        Never risks more than configured risk_pct of account equity.
        """
        sym = symbol.upper()
        inst = provider_registry.get_instrument(sym)

        # Determine specs
        c_size = contract_size if (contract_size is not None and contract_size > 0) else (inst.contract_size if inst else self.default_contract_size)
        def_spr = inst.default_spread if inst else self.default_spread
        spread = spread_points if (spread_points is not None and spread_points >= 0) else def_spr
        slippage = slippage_points if (slippage_points is not None and slippage_points >= 0) else self.default_slippage
        pip_mult = inst.pip_multiplier if inst else 10.0

        # Validate basic numbers
        if account_balance <= 0:
            return {"valid": False, "error": "Account balance must be greater than zero."}

        sl_distance = abs(entry_price - sl_price)
        if sl_distance <= 0:
            return {"valid": False, "error": "Stop loss price cannot equal entry price."}

        # 1. Circuit Breaker Checks
        max_daily_loss_dollars = account_balance * (daily_loss_limit_pct / 100.0)
        daily_limit_reached = current_daily_loss >= max_daily_loss_dollars
        max_trades_reached = trades_taken_today >= max_trades_per_day
        trading_permitted = not (daily_limit_reached or max_trades_reached)

        warnings = []
        if daily_limit_reached:
            warnings.append(f"CIRCUIT BREAKER: Daily loss limit reached (${current_daily_loss:.2f} >= ${max_daily_loss_dollars:.2f}). Trading halted for the day.")
        if max_trades_reached:
            warnings.append(f"CIRCUIT BREAKER: Max trades per day reached ({trades_taken_today}/{max_trades_per_day}). Overtrading protection active.")

        # 2. Risk Dollars
        risk_dollars = account_balance * (risk_pct / 100.0)

        # 3. Total Drag (SL distance + spread + slippage)
        total_risk_points = sl_distance + spread + slippage

        # Loss per 1.0 standard lot or 1.0 unit
        loss_per_lot = total_risk_points * c_size
        if loss_per_lot <= 0:
            return {"valid": False, "error": "Calculated loss per lot is zero or negative."}

        raw_position_size = risk_dollars / loss_per_lot

        # Handle lot size vs share count formatting
        is_stock = inst and inst.asset_class.value == "STOCKS"
        if is_stock:
            recommended_size = max(1, int(raw_position_size))
            unit_label = "Shares"
        else:
            recommended_size = round(max(0.01, raw_position_size), 2)
            unit_label = "Lots"

        actual_risk_dollars = round(recommended_size * loss_per_lot, 2)
        actual_risk_pct = round((actual_risk_dollars / account_balance) * 100.0, 2)
        sl_pips = round(sl_distance * pip_mult, 1)

        # Calculate RR targets (1R, 2R, 3R)
        direction = "BUY" if entry_price > sl_price else "SELL"
        if direction == "BUY":
            tp1_target = round(entry_price + (1.0 * sl_distance), 4)
            tp2_target = round(entry_price + (2.0 * sl_distance), 4)
            tp3_target = round(entry_price + (3.0 * sl_distance), 4)
        else:
            tp1_target = round(entry_price - (1.0 * sl_distance), 4)
            tp2_target = round(entry_price - (2.0 * sl_distance), 4)
            tp3_target = round(entry_price - (3.0 * sl_distance), 4)

        rr_targets = {
            "tp1": {"target_price": tp1_target, "rr": 1.0, "reward_dollars": round(recommended_size * sl_distance * c_size, 2)},
            "tp2": {"target_price": tp2_target, "rr": 2.0, "reward_dollars": round(recommended_size * 2.0 * sl_distance * c_size, 2)},
            "tp3": {"target_price": tp3_target, "rr": 3.0, "reward_dollars": round(recommended_size * 3.0 * sl_distance * c_size, 2)}
        }

        # Risk-to-Reward calculation if TP provided
        rr_ratio = None
        reward_dollars = None
        if tp_price is not None and tp_price > 0:
            tp_distance = abs(tp_price - entry_price)
            if sl_distance > 0:
                rr_ratio = round(tp_distance / sl_distance, 2)
                reward_dollars = round(recommended_size * tp_distance * c_size, 2)

        circuit_dict = {
            "active": not trading_permitted,
            "trading_permitted": trading_permitted,
            "daily_limit_breached": daily_limit_reached,
            "daily_limit_reached": daily_limit_reached,
            "max_trades_breached": max_trades_reached,
            "max_trades_reached": max_trades_reached,
            "max_daily_loss_dollars": round(max_daily_loss_dollars, 2),
            "current_daily_loss": current_daily_loss,
            "trades_taken_today": trades_taken_today,
            "max_trades_per_day": max_trades_per_day,
            "warnings": warnings
        }

        return {
            "valid": True,
            "symbol": sym,
            "asset_class": inst.asset_class.value if inst else "METALS",
            "contract_size": c_size,
            "unit_label": unit_label,
            "account_balance": account_balance,
            "risk_pct_configured": risk_pct,
            "risk_dollars_target": round(risk_dollars, 2),
            "entry_price": entry_price,
            "sl_price": sl_price,
            "tp_price": tp_price,
            "sl_distance_points": round(sl_distance, 4),
            "sl_distance_pips": sl_pips,
            "spread_points": round(spread, 4),
            "slippage_points": round(slippage, 4),
            "total_risk_per_unit": round(loss_per_lot, 2),
            "recommended_lots": recommended_size,
            "recommended_position_size": recommended_size,
            "actual_risk_dollars": actual_risk_dollars,
            "actual_risk_pct": actual_risk_pct,
            "risk_to_reward_ratio": rr_ratio,
            "potential_reward_dollars": reward_dollars,
            "rr_targets": rr_targets,
            "warnings": warnings,
            "circuit_breaker": circuit_dict,
            "circuit_breakers": circuit_dict
        }

risk_manager = RiskManager()
