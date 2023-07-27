import * as anchor from "@project-serum/anchor";

export async function createKeypairFromFile(): Promise<anchor.web3.Keypair> {
  const secretKey = Uint8Array.from([
    238, 92, 30, 199, 165, 249, 239, 85, 211, 92, 154, 189, 154, 105, 214, 239,
    95, 102, 73, 213, 112, 118, 44, 221, 62, 159, 192, 64, 232, 101, 238, 132,
    145, 50, 151, 16, 236, 72, 7, 164, 56, 30, 206, 208, 253, 174, 84, 218, 48,
    142, 164, 220, 125, 222, 180, 160, 220, 235, 118, 239, 78, 108, 225, 23,
  ]);
  return anchor.web3.Keypair.fromSecretKey(secretKey);
}
