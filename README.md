# NFT Holder Analyzer

## Overview

NFT Holder Analyzer is a Node.js script that retrieves and updates the current holders of a given NFT collection using Multicall3 for efficiency. It stores the results in a MongoDB database.

## Features

- Uses **Multicall3** to batch `ownerOf` calls for efficient NFT ownership retrieval.
- Stores NFT holder data in **MongoDB** with upsert operations.
- Processes NFTs in **batches of 4000** to avoid rate limits.
- Handles **failures gracefully** with logging.

## Requirements

- Node.js
- MongoDB Atlas (or a local MongoDB instance)
- `.env` file with the following environment variables:
  ```
  ETH_RPC_URL=<your_rpc_url>
  MONGODB_URI=<your_mongodb_connection_string>
  ```

## Installation

```sh
git clone <repo-url>
cd getNFTData
npm install
```

## Usage

1. Ensure you have a valid `.env` file with your RPC and MongoDB connection details.
2. Run the script:
   ```sh
   node getMiladyCurrentHolders.js
   ```

## How It Works

1. Connects to the specified MongoDB database.
2. Fetches the total NFT supply from the contract.
3. Uses **Multicall3** to fetch the owner of each NFT in batches.
4. Updates the MongoDB database with the latest holder information.
5. Logs progress and handles errors.

## Dependencies

- `dotenv`: For environment variable management.
- `mongoose`: For MongoDB interaction.
- `ethers`: For Ethereum smart contract interactions.

## License

MIT

