import "dotenv/config";
import mongoose from "mongoose";
import { ethers } from "ethers";

// MongoDB Schema for current NFT holders
const NFTHolderSchema = new mongoose.Schema({
  nftId: { type: Number, required: true, unique: true, index: true },
  holderAddress: { type: String, required: true, index: true },
  lastUpdated: { type: Date, default: Date.now },
});

// Create model
const NFTHolder = mongoose.model("currentNFTHolders", NFTHolderSchema);

// Multicall3 contract address (same on all networks)
const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

// Multicall3 ABI (only the aggregate3 function we need)
const MULTICALL3_ABI = [
  "function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) view returns (tuple(bool success, bytes returnData)[])",
];

// Main class for handling NFT holders
class NFTHolderAnalyzer {
  constructor(contractAddress, provider) {
    this.contractAddress = contractAddress;
    this.provider = provider;

    // Milady NFT contract interface
    this.nftInterface = new ethers.Interface([
      "function ownerOf(uint256 tokenId) view returns (address)",
      "function totalSupply() view returns (uint256)",
    ]);

    // NFT contract
    this.contract = new ethers.Contract(
      contractAddress,
      this.nftInterface,
      provider
    );

    // Multicall contract
    this.multicall = new ethers.Contract(
      MULTICALL3_ADDRESS,
      MULTICALL3_ABI,
      provider
    );
  }

  async getCurrentHolders() {
    try {
      const totalSupply = Number(await this.contract.totalSupply());
      console.log(`Total NFTs to process: ${totalSupply}`);

      const batchSize = 4000; // Process 4000 NFTs at a time using multicall
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      for (let i = 0; i < totalSupply; i += batchSize) {
        const end = Math.min(i + batchSize, totalSupply);
        console.log(`Processing NFTs ${i} to ${end - 1}`);

        // Prepare multicall calls
        const calls = Array.from({ length: end - i }, (_, index) => ({
          target: this.contractAddress,
          allowFailure: true, // Allow individual calls to fail
          callData: this.nftInterface.encodeFunctionData("ownerOf", [
            i + index,
          ]),
        }));

        // Execute multicall
        const results = await this.multicall.aggregate3(calls);

        // Process results
        const batch = results
          .map((result, index) => {
            if (!result.success) {
              console.error(`Error fetching owner for token ${i + index}`);
              return null;
            }
            return {
              nftId: i + index,
              holderAddress: this.nftInterface
                .decodeFunctionResult("ownerOf", result.returnData)[0]
                .toLowerCase(),
              lastUpdated: new Date(),
            };
          })
          .filter(Boolean); // Remove null entries

        // Update database in batch
        if (batch.length > 0) {
          await NFTHolder.bulkWrite(
            batch.map((holder) => ({
              updateOne: {
                filter: { nftId: holder.nftId },
                update: { $set: holder },
                upsert: true,
              },
            }))
          );
        }

        // Add small delay between batches to avoid rate limiting
        await delay(500);
      }

      console.log("Finished updating NFT holders");
    } catch (error) {
      console.error("Error in getCurrentHolders:", error);
      throw error;
    }
  }
}

async function main() {
  try {
    // Connect to MongoDB
    await mongoose.connect(
      process.env.MONGODB_URI
    );
    console.log("Connected to MongoDB");

    // Initialize provider
    const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);

    // Milady NFT contract address
    const contractAddress = "0x5Af0D9827E0c53E4799BB226655A1de152A425a5";

    const analyzer = new NFTHolderAnalyzer(contractAddress, provider);
    await analyzer.getCurrentHolders();

    console.log("Successfully updated NFT holders");
  } catch (error) {
    console.error("Error in main:", error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
