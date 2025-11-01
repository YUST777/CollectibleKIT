"""
TON Address Utilities
Handles conversion between different TON address formats
"""

import logging
from typing import Optional
from pytoniq_core import Address

logger = logging.getLogger(__name__)

def convert_to_friendly_address(raw_address: str) -> Optional[str]:
    """
    Convert any TON address format to friendly UQ format
    
    Args:
        raw_address: Any TON address format
        
    Returns:
        Friendly address format (UQ...) or None if invalid
    """
    try:
        if not raw_address:
            return None
        
        # Handle Address object string representation
        if raw_address.startswith('Address<') and raw_address.endswith('>'):
            # Extract the actual address from Address<...> format
            address_part = raw_address[8:-1]  # Remove "Address<" and ">"
            raw_address = address_part
        
        # Check if already in friendly format
        if raw_address.startswith(('UQ', 'EQ', 'kQ', '0Q')):
            logger.info(f"Address already in friendly format: {raw_address}")
            return raw_address
        
        # Check if it's raw format (0:... or -1:...)
        if raw_address.startswith(('0:', '-1:')):
            logger.info(f"Converting raw address: {raw_address}")
            raw_addr = Address(raw_address)
            # Convert to non-bounceable friendly format (UQ...)
            friendly_address = raw_addr.to_str(is_bounceable=False, is_url_safe=True)
            logger.info(f"Converted to friendly format: {friendly_address}")
            return friendly_address
        
        # Try to parse as is (might be other format)
        addr = Address(raw_address)
        friendly_address = addr.to_str(is_bounceable=False, is_url_safe=True)
        logger.info(f"Parsed and converted address: {friendly_address}")
        return friendly_address
        
    except Exception as e:
        logger.error(f"Failed to convert address {raw_address}: {str(e)}")
        return None

def normalize_address(address: str) -> Optional[str]:
    """
    Normalize any TON address format to friendly UQ format
    
    Args:
        address: Any TON address format
        
    Returns:
        Normalized friendly address (UQ...) or None if invalid
    """
    return convert_to_friendly_address(address)

def is_valid_ton_address(address: str) -> bool:
    """
    Check if address is a valid TON address in any format
    
    Args:
        address: Address to validate
        
    Returns:
        True if valid, False otherwise
    """
    try:
        if not address:
            return False
        
        # Try to create Address object
        addr = Address(address)
        return True
        
    except Exception:
        return False

def get_address_info(address: str) -> Optional[dict]:
    """
    Get information about a TON address
    
    Args:
        address: TON address in any format
        
    Returns:
        Dictionary with address info or None if invalid
    """
    try:
        if not address:
            return None
        
        addr = Address(address)
        
        # Get different representations
        friendly_bounceable = addr.to_str(is_bounceable=True, is_url_safe=True)
        friendly_non_bounceable = addr.to_str(is_bounceable=False, is_url_safe=True)
        raw_format = str(addr)
        
        return {
            "raw": raw_format,
            "friendly_bounceable": friendly_bounceable,
            "friendly_non_bounceable": friendly_non_bounceable,
            "workchain": getattr(addr, 'workchain', 'unknown'),
            "is_testnet": friendly_bounceable.startswith(('kQ', '0Q')),
            "is_mainnet": friendly_bounceable.startswith(('EQ', 'UQ'))
        }
        
    except Exception as e:
        logger.error(f"Failed to get address info for {address}: {str(e)}")
        return None

# Common address format examples for reference
ADDRESS_FORMATS = {
    "raw_mainnet": "0:fe2345a67b...",
    "raw_testnet": "-1:abcd1234...",
    "friendly_bounceable_mainnet": "EQD...",
    "friendly_non_bounceable_mainnet": "UQD...",
    "friendly_bounceable_testnet": "kQD...",
    "friendly_non_bounceable_testnet": "0QD..."
}
