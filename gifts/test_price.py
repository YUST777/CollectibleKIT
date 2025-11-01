#!/usr/bin/env python3
import asyncio
from aportalsmp import search as search_gifts, update_auth

async def test():
    print("Getting auth...")
    authData = await update_auth(
        api_id=22307634, 
        api_hash='7ab906fc6d065a2047a84411c1697593', 
        session_name="portals_session", 
        session_path="/home/yousefmsm1/Desktop/gifts"
    )
    print(f"Auth: {len(authData)} chars")
    
    # Test exactly what bot does
    print("\nTesting TamaGadget with Onyx Black...")
    results = await search_gifts(
        sort="price_asc",
        limit=1,
        gift_name="TamaGadget",
        backdrop="Onyx Black",
        authData=authData
    )
    
    if results:
        print(f"✅ Found price: {results[0].price} TON")
    else:
        print("❌ No results")

asyncio.run(test())
