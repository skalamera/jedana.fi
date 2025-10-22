import yfinance as yf
import pandas_ta as ta
import pandas as pd
import numpy as np
from scipy.signal import find_peaks

def get_technical_data(ticker):
    """
    Fetches and calculates technical data for a given stock ticker.

    Args:
        ticker (str): The stock ticker symbol (e.g., 'AAPL').

    Returns:
        pandas.DataFrame: A DataFrame containing the historical data and technical indicators.
        list: A list of identified support levels.
        list: A list of identified resistance levels.
    """
    try:
        # Fetch historical data
        data = yf.download(ticker, period="1y", interval="1d", auto_adjust=True)

        if data.empty:
            print(f"No data found for ticker: {ticker}")
            return None, None, None

        # If still MultiIndex (for some edge cases), handle it properly
        if isinstance(data.columns, pd.MultiIndex):
            data = data.xs(ticker, level=1, axis=1)

        # Calculate RSI
        data.ta.rsi(append=True)

        # Calculate Moving Averages (50-day and 200-day)
        data.ta.sma(length=50, append=True)
        data.ta.sma(length=200, append=True)

        # Identify Support and Resistance Levels
        # Find peaks (resistance)
        peaks, _ = find_peaks(data['High'], distance=10, prominence=1)
        resistance_levels = data['High'].iloc[peaks].tolist()

        # Find troughs (support)
        troughs, _ = find_peaks(-data['Low'], distance=10, prominence=1)
        support_levels = data['Low'].iloc[troughs].tolist()

        return data, support_levels, resistance_levels

    except Exception as e:
        print(f"An error occurred: {e}")
        return None, None, None

if __name__ == "__main__":
    # Run for AAPL
    ticker_symbol = "AAPL"

    # Get the technical data
    stock_data, supports, resistances = get_technical_data(ticker_symbol)

    if stock_data is not None:
        print(f"\n--- Technical Data for {ticker_symbol} ---")

        # Print the latest technical indicators
        print("\nLatest Indicators:")
        print(stock_data.tail(1)[['RSI_14', 'SMA_50', 'SMA_200']])

        # Print the identified support and resistance levels
        print("\nIdentified Support Levels:")
        if supports:
            for level in sorted(list(set(supports)), reverse=True):
                print(f"${level:.2f}")
        else:
            print("No significant support levels found.")

        print("\nIdentified Resistance Levels:")
        if resistances:
            for level in sorted(list(set(resistances))):
                print(f"${level:.2f}")
        else:
            print("No significant resistance levels found.")