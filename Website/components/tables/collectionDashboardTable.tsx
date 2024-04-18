import { useEffect, useState, useCallback } from "react";
import { LaunchData, UserData, bignum_to_num, create_LaunchDataInput, get_current_blockhash, send_transaction } from "../Solana/state";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Badge, Box, Button, Center, HStack, Link, TableContainer, Text, VStack } from "@chakra-ui/react";
import { TfiReload } from "react-icons/tfi";
import { FaSort } from "react-icons/fa";
import { useWallet } from "@solana/wallet-adapter-react";
import useResponsive from "../../hooks/useResponsive";
import Image from "next/image";
import useAppRoot from "../../context/useAppRoot";
import useDetermineCookState, { CookState } from "../../hooks/useDetermineCookState";
import { useRouter } from "next/router";
import { PublicKey, Transaction, TransactionInstruction, Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { toast } from "react-toastify";
import { CollectionData } from "../collection/collectionState";
import { CollectionKeys } from "../Solana/constants";
import { HypeVote } from "../hypeVote";
import { route } from "../../utils/navigateTo";

interface Header {
    text: string;
    field: string | null;
}

interface TransferAccount {
    pubkey: PublicKey;
    amount: number;
}

const CollectionDashboardTable = ({ collectionList }: { collectionList: CollectionData[] }) => {
    const { sm } = useResponsive();
    const wallet = useWallet();

    const tableHeaders: Header[] = [
        { text: "COLLECTION", field: null },
        { text: "TOKEN", field: null },
        { text: "HYPE", field: "hype" },
        { text: "TOKENS PER NFT", field: "tokens per nft" },
        { text: "UNWRAP FEE", field: "unwrap fee" },
        { text: "TOTAL SUPPLY", field: "total supply" },
    ];

    return (
        <TableContainer>
            <table
                width="100%"
                className="custom-centered-table font-face-rk"
                style={{ background: "linear-gradient(180deg, #292929 10%, #0B0B0B 100%)" }}
            >
                <thead>
                    <tr
                        style={{
                            height: "50px",
                            borderTop: "1px solid rgba(134, 142, 150, 0.5)",
                            borderBottom: "1px solid rgba(134, 142, 150, 0.5)",
                        }}
                    >
                        {tableHeaders.map((i) => (
                            <th key={i.text} style={{ minWidth: sm ? "90px" : "120px" }}>
                                <HStack gap={sm ? 1 : 2} justify="center" style={{ cursor: i.text === "LOGO" ? "" : "pointer" }}>
                                    <Text fontSize={sm ? "medium" : "large"} m={0}>
                                        {i.text}
                                    </Text>
                                    {i.text === "LOGO" ? <></> : <FaSort />}
                                </HStack>
                            </th>
                        ))}

                        <th>
                            <Box mt={1} as="button">
                                <TfiReload size={sm ? 18 : 20} />
                            </Box>
                        </th>
                    </tr>
                </thead>

                <tbody>
                    {collectionList.map((launch) => (
                        <LaunchCard key={launch.page_name} launch={launch} />
                    ))}
                </tbody>
            </table>
        </TableContainer>
    );
};

const LaunchCard = ({ launch }: { launch: CollectionData }) => {
    const router = useRouter();
    const { network } = router.query;
    const { sm, md, lg } = useResponsive();
    //console.log(launch);
    return (
        <tr
            style={{
                cursor: "pointer",
                height: "60px",
                transition: "background-color 0.3s",
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.1)";
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = ""; // Reset to default background color
            }}
            onClick={() => router.push(route(`/collection/` + launch.page_name, network))}
        >
            <td style={{ minWidth: "160px" }}>
                <HStack m="0 auto" w={160} px={3} spacing={3} justify="start">
                    <Box w={45} h={45} borderRadius={10} style={{ minWidth: "45px" }}>
                        <Image
                            alt="Launch icon"
                            src={launch.collection_icon_url}
                            width={45}
                            height={45}
                            style={{ borderRadius: "8px", backgroundSize: "cover" }}
                        />
                    </Box>
                    <Text fontSize={"large"} m={0}>
                        {launch.collection_symbol}
                    </Text>
                </HStack>
            </td>
            <td style={{ minWidth: "160px" }}>
                <HStack m="0 auto" w={160} px={3} spacing={3} justify="start">
                    <Box w={45} h={45} borderRadius={10}>
                        <Image
                            alt="Launch icon"
                            src={launch.token_icon_url}
                            width={45}
                            height={45}
                            style={{ borderRadius: "8px", backgroundSize: "cover" }}
                        />
                    </Box>
                    <Text fontSize={"large"} m={0}>
                        {launch.token_symbol}
                    </Text>
                </HStack>
            </td>
            <td style={{ minWidth: "150px" }}>
                <HypeVote
                    launch_type={1}
                    launch_id={launch.launch_id}
                    page_name={launch.page_name}
                    positive_votes={launch.positive_votes}
                    negative_votes={launch.negative_votes}
                    seller_key={launch.keys[CollectionKeys.Seller]}
                    isTradePage={false}
                />
            </td>
            <td style={{ minWidth: sm ? "170px" : "200px" }}>
                <Text fontSize={"large"} m={0}>
                    {(bignum_to_num(launch.swap_price) / Math.pow(10, launch.token_decimals)).toLocaleString()}
                </Text>
            </td>
            <td style={{ minWidth: "150px" }}>
                <Text fontSize={"large"} m={0}>
                    {launch.swap_fee / 100}{" "}
                </Text>
            </td>
            <td style={{ minWidth: "170px" }}>
                <Text fontSize={"large"} m={0}>
                    {launch.total_supply}
                </Text>
            </td>
            <td style={{ minWidth: "100px" }}>
                <Button onClick={() => router.push(route(`/collection/` + launch.page_name, network))} style={{ textDecoration: "none" }}>
                    View
                </Button>
            </td>
        </tr>
    );
};

export default CollectionDashboardTable;
