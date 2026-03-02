import { PublicKey } from "@solana/web3.js";

// The official SHIP token mint on Mainnet
export const SHIP_TOKEN_MINT = new PublicKey("4KWDP6DpqrhB7Cm1fgFZFC1JYyikdo4oCKyiZ56xpump");

// The live program ID (Note: This is currently offline as we deleted the program)
export const SHIPQUEST_PROGRAM_ID = new PublicKey("zBMySKnu6U3hFZM5wsi4ZkAN573HZD9axaoNDCkx7QV");

/**
 * Helper to get the PDA for a specific campaign state
 */
export const getCampaignPDA = (admin: PublicKey, campaignId: string) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("campaign"), admin.toBuffer(), Buffer.from(campaignId)],
        SHIPQUEST_PROGRAM_ID
    );
};

/**
 * Helper to get the PDA for the campaign's token vault
 */
export const getVaultTokenPDA = (campaignPDA: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("campaign_vault"), campaignPDA.toBuffer()],
        SHIPQUEST_PROGRAM_ID
    );
};
