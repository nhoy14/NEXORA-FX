"""
NEXORA FX — Multi-Market Backtesting Engine
Walk-forward historical simulator with zero look-ahead bias:
- Strict bar-by-bar chronological execution on closed bars
- Spread, slippage, and round-turn commission modeling
- Conservative dual-touch collision resolution (SL prioritized on dual-touch bars)
- Single concurrent position enforcement (prevents duplicate stacking)
- In-sample / Out-of-sample period partitioning
- Supports Forex, Metals, Crypto, Indices, Stocks, and Commodities
"""

from typing import List, Dict, Any, Optional
import math
from backend.indicators import compute_indicators
from backend.msnr_smc import MSNR_SMC_Analyzer
from backend.signal_engine import SignalEngine
from backend.risk_manager import RiskManager
from backend.market_data.registry import provider_registry

class BacktestEngine:
    def __init__(self):
        self.risk_manager = RiskManager()
        self.msnr_analyzer = MSNR_SMC_Analyzer()
        self.signal_engine = SignalEngine()

    def run_backtest(
        self,
        candles: List[Dict[str, Any]],
        symbol: str = "XAUUSD",
        timeframe: str = "M15",
        initial_balance: float = 10000.0,
        risk_pct: float = 1.0,
        min_score: int = 70,
        target_rr: float = 2.0,
        spread_points: Optional[float] = None,
        slippage_points: Optional[float] = None,
        commission_per_lot: float = 5.0,
        contract_size: Optional[float] = None,
        out_of_sample_split: float = 0.0
    ) -> Dict[str, Any]:
        """
        Executes chronological simulation over provided candles.
        Avoids look-ahead bias by slicing history up to bar i.
        """
        if not candles or len(candles) < 50:
            return {
                "success": False,
                "error": "Insufficient candle data for meaningful backtest (minimum 50 bars required)."
            }

        sym = symbol.upper()
        inst = provider_registry.get_instrument(sym)
        c_size = contract_size if (contract_size is not None and contract_size > 0) else (inst.contract_size if inst else 100.0)
        default_spr = inst.default_spread if inst else 0.25
        spread = spread_points if (spread_points is not None and spread_points >= 0) else default_spr
        slippage = slippage_points if (slippage_points is not None and slippage_points >= 0) else (default_spr * 0.4)

        total_bars = len(candles)
        split_idx = int(total_bars * (1.0 - out_of_sample_split)) if out_of_sample_split > 0 else total_bars

        warmup_bars = 30
        if split_idx <= warmup_bars:
            warmup_bars = 15

        current_balance = initial_balance
        peak_balance = initial_balance
        max_drawdown_dollars = 0.0
        max_drawdown_pct = 0.0

        equity_curve = [{"time": candles[warmup_bars]["time"], "equity": round(current_balance, 2), "drawdown_pct": 0.0}]
        trades: List[Dict[str, Any]] = []
        open_position: Optional[Dict[str, Any]] = None

        long_trades = 0
        long_wins = 0
        long_pnl = 0.0
        short_trades = 0
        short_wins = 0
        short_pnl = 0.0

        for i in range(warmup_bars, total_bars):
            c_bar = candles[i]
            b_high = float(c_bar["high"])
            b_low = float(c_bar["low"])
            b_open = float(c_bar["open"])
            b_close = float(c_bar["close"])
            b_time = int(c_bar["time"])

            # 1. Manage Open Position if exists
            if open_position is not None:
                p_dir = open_position["direction"]
                p_entry = open_position["entry_price"]
                p_sl = open_position["sl_price"]
                p_tp = open_position["tp_price"]
                p_lot = open_position["lot_size"]
                p_risk_dist = open_position["risk_distance"]

                closed = False
                exit_price = 0.0
                exit_reason = ""
                realized_r = 0.0

                if p_dir == "BUY":
                    hit_sl = b_low <= p_sl
                    hit_tp = b_high >= p_tp

                    if hit_sl and hit_tp:
                        closed = True
                        exit_price = p_sl - slippage
                        exit_reason = "SL (Dual-touch conservative)"
                        realized_r = -1.0
                    elif hit_sl:
                        closed = True
                        exit_price = p_sl - slippage
                        exit_reason = "SL"
                        realized_r = -1.0
                    elif hit_tp:
                        closed = True
                        exit_price = p_tp
                        exit_reason = f"TP ({target_rr}R)"
                        realized_r = target_rr

                    if closed:
                        gross_pnl = (exit_price - p_entry) * p_lot * c_size
                        comm = commission_per_lot * p_lot
                        net_pnl = gross_pnl - comm
                        current_balance += net_pnl

                        long_trades += 1
                        long_pnl += net_pnl
                        if net_pnl > 0:
                            long_wins += 1

                        trades.append({
                            "trade_no": len(trades) + 1,
                            "symbol": sym,
                            "direction": "BUY",
                            "entry_time": open_position["entry_time"],
                            "exit_time": b_time,
                            "entry_price": round(p_entry, 4),
                            "exit_price": round(exit_price, 4),
                            "sl_price": round(p_sl, 4),
                            "tp_price": round(p_tp, 4),
                            "lot_size": p_lot,
                            "gross_pnl": round(gross_pnl, 2),
                            "commission": round(comm, 2),
                            "net_pnl": round(net_pnl, 2),
                            "realized_r": round(realized_r, 2),
                            "outcome": "WIN" if net_pnl > 0 else "LOSS",
                            "exit_reason": exit_reason,
                            "is_out_of_sample": i >= split_idx
                        })
                        open_position = None

                elif p_dir == "SELL":
                    hit_sl = b_high >= p_sl
                    hit_tp = b_low <= p_tp

                    if hit_sl and hit_tp:
                        closed = True
                        exit_price = p_sl + slippage
                        exit_reason = "SL (Dual-touch conservative)"
                        realized_r = -1.0
                    elif hit_sl:
                        closed = True
                        exit_price = p_sl + slippage
                        exit_reason = "SL"
                        realized_r = -1.0
                    elif hit_tp:
                        closed = True
                        exit_price = p_tp
                        exit_reason = f"TP ({target_rr}R)"
                        realized_r = target_rr

                    if closed:
                        gross_pnl = (p_entry - exit_price) * p_lot * c_size
                        comm = commission_per_lot * p_lot
                        net_pnl = gross_pnl - comm
                        current_balance += net_pnl

                        short_trades += 1
                        short_pnl += net_pnl
                        if net_pnl > 0:
                            short_wins += 1

                        trades.append({
                            "trade_no": len(trades) + 1,
                            "symbol": sym,
                            "direction": "SELL",
                            "entry_time": open_position["entry_time"],
                            "exit_time": b_time,
                            "entry_price": round(p_entry, 4),
                            "exit_price": round(exit_price, 4),
                            "sl_price": round(p_sl, 4),
                            "tp_price": round(p_tp, 4),
                            "lot_size": p_lot,
                            "gross_pnl": round(gross_pnl, 2),
                            "commission": round(comm, 2),
                            "net_pnl": round(net_pnl, 2),
                            "realized_r": round(realized_r, 2),
                            "outcome": "WIN" if net_pnl > 0 else "LOSS",
                            "exit_reason": exit_reason,
                            "is_out_of_sample": i >= split_idx
                        })
                        open_position = None

            # Track Drawdown
            if current_balance > peak_balance:
                peak_balance = current_balance
            dd_dollars = peak_balance - current_balance
            dd_pct = (dd_dollars / peak_balance) * 100.0 if peak_balance > 0 else 0.0
            if dd_dollars > max_drawdown_dollars:
                max_drawdown_dollars = dd_dollars
            if dd_pct > max_drawdown_pct:
                max_drawdown_pct = dd_pct

            # Equity curve point
            if i % 3 == 0 or i == total_bars - 1:
                equity_curve.append({
                    "time": b_time,
                    "equity": round(current_balance, 2),
                    "drawdown_pct": round(dd_pct, 2)
                })

            # 2. Check for New Signal (if no open trade)
            if open_position is None and i < total_bars - 1:
                history_slice = candles[:i + 1]
                ind_res = compute_indicators(history_slice)
                atr_val = ind_res.get("latest", {}).get("atr", 1.5)
                msnr_res = self.msnr_analyzer.analyze(history_slice, atr_val=atr_val)

                sig = self.signal_engine.generate_signal(
                    timeframe=timeframe,
                    candles=history_slice,
                    indicators_data=ind_res,
                    msnr_data=msnr_res,
                    symbol=sym,
                    data_status="LIVE",
                    min_score=min_score
                )

                if sig["direction"] in ["BUY", "SELL"] and sig["status"] == "ACTIVE_SETUP":
                    entry_p = float(sig["entry_price"])
                    sl_p = float(sig["sl_price"])
                    risk_dist = abs(entry_p - sl_p)

                    pos_calc = self.risk_manager.calculate_position(
                        account_balance=current_balance,
                        risk_pct=risk_pct,
                        entry_price=entry_p,
                        sl_price=sl_p,
                        symbol=sym,
                        spread_points=spread,
                        slippage_points=slippage,
                        contract_size=c_size
                    )

                    if pos_calc.get("valid", False):
                        lot_sz = pos_calc["recommended_lots"]
                        if sig["direction"] == "BUY":
                            target_tp = round(entry_p + (target_rr * risk_dist), 4)
                            actual_entry = entry_p + (spread / 2.0) + slippage
                        else:
                            target_tp = round(entry_p - (target_rr * risk_dist), 4)
                            actual_entry = entry_p - (spread / 2.0) - slippage

                        open_position = {
                            "direction": sig["direction"],
                            "entry_price": round(actual_entry, 4),
                            "sl_price": sl_p,
                            "tp_price": target_tp,
                            "lot_size": lot_sz,
                            "risk_distance": risk_dist,
                            "entry_time": b_time,
                            "setup_score": sig["setup_score"]
                        }

        # Summary Metrics
        total_trades = len(trades)
        winning_trades = len([t for t in trades if t["outcome"] == "WIN"])
        losing_trades = len([t for t in trades if t["outcome"] == "LOSS"])
        win_rate = (winning_trades / total_trades * 100.0) if total_trades > 0 else 0.0

        gross_profit = sum([t["net_pnl"] for t in trades if t["net_pnl"] > 0])
        gross_loss = abs(sum([t["net_pnl"] for t in trades if t["net_pnl"] < 0]))
        net_profit = current_balance - initial_balance

        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (999.0 if gross_profit > 0 else 0.0)
        avg_r = (sum([t["realized_r"] for t in trades]) / total_trades) if total_trades > 0 else 0.0

        return {
            "success": True,
            "symbol": sym,
            "timeframe": timeframe,
            "period": {
                "start": candles[0].get("iso_time", str(candles[0]["time"])),
                "end": candles[-1].get("iso_time", str(candles[-1]["time"])),
                "total_candles": total_bars
            },
            "parameters": {
                "initial_balance": initial_balance,
                "risk_pct": risk_pct,
                "min_score": min_score,
                "target_rr": target_rr,
                "spread_points": spread,
                "slippage_points": slippage,
                "commission_per_lot": commission_per_lot,
                "contract_size": c_size
            },
            "metrics": {
                "initial_balance": round(initial_balance, 2),
                "final_balance": round(current_balance, 2),
                "net_profit": round(net_profit, 2),
                "return_pct": round((net_profit / initial_balance) * 100.0, 2),
                "total_trades": total_trades,
                "winning_trades": winning_trades,
                "losing_trades": losing_trades,
                "win_rate_pct": round(win_rate, 2),
                "profit_factor": round(profit_factor, 2),
                "max_drawdown_dollars": round(max_drawdown_dollars, 2),
                "max_drawdown_pct": round(max_drawdown_pct, 2),
                "average_r": round(avg_r, 2),
                "gross_profit": round(gross_profit, 2),
                "gross_loss": round(gross_loss, 2)
            },
            "long_vs_short": {
                "long": {
                    "total": long_trades,
                    "wins": long_wins,
                    "win_rate_pct": round((long_wins / long_trades * 100.0) if long_trades > 0 else 0.0, 2),
                    "net_pnl": round(long_pnl, 2)
                },
                "short": {
                    "total": short_trades,
                    "wins": short_wins,
                    "win_rate_pct": round((short_wins / short_trades * 100.0) if short_trades > 0 else 0.0, 2),
                    "net_pnl": round(short_pnl, 2)
                }
            },
            "trades": trades,
            "equity_curve": equity_curve
        }

backtest_engine = BacktestEngine()
