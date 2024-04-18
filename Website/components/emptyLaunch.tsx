import { Box, Flex, Grid, GridItem, HStack, Text, Tooltip, VStack } from "@chakra-ui/react";
import EmptyLaunches from "../public/images/healthy-food-rafiki-empty.svg";
import Image from "next/image";
import useResponsive from "../hooks/useResponsive";
import WoodenButton from "./Buttons/woodenButton";
import Link from "next/link";
import botProof from "../public/images/no-bot.svg";
import mintInsurance from "../public/images/mint-insurance.png";
import coins from "../public/images/coins-svgrepo-com.svg";
import stock from "../public/images/stock-ticker-svgrepo-com.svg";
import { useWallet } from "@solana/wallet-adapter-react";
import UseWalletConnection from "../hooks/useWallet";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { isHomePageOnly } from "../constant/root";
import useAppRoot from "../context/useAppRoot";

const EmptyLaunch = () => {
    const wallet = useWallet();
    const router = useRouter();
    const { handleConnectWallet } = UseWalletConnection();
    const { sm, md, lg, xl, xxl } = useResponsive();
    const { network } = router.query;

    return (
        // <Flex
        //     style={{
        //         background: "linear-gradient(180deg, #292929 50%, #0B0B0B 100%)",
        //         height: "90vh",
        //         flexDirection: md ? "column" : "row",
        //     }}
        //     align="center"
        //     justify="center"
        //     gap={sm ? 3 : 24}
        // >
        //     <Image
        //         src={EmptyLaunches}
        //         width={md ? 300 : 600}
        //         height={md ? 300 : 600}
        //         alt="404 Error with a cute animal-cute"
        //         style={{ marginLeft: "12px", marginTop: "-40px" }}
        //     />

        //     <VStack w={md ? "100%" : "800px"} spacing={15} align={md ? "center" : "start"}>
        //         <Text m={0} fontSize={lg ? 30 : 55} color="white" className="font-face-kg" style={{ wordBreak: "break-word" }}>
        //             No Launches Yet
        //         </Text>

        //         <Text
        //             fontFamily="ReemKufiRegular"
        //             fontSize={md ? "large" : "x-large"}
        //             color="white"
        //             maxW={sm ? "100%" : md ? "600px" : "850px"}
        //             mr={md ? 0 : 25}
        //             align={sm ? "center" : "start"}
        //         >
        //             We&apos;re currently working hard behind the scenes to bring you exciting meals. Stay tuned for updates! In the
        //             meantime, feel free to cook your own.
        //         </Text>
        //         <Link href="/launch">
        //             <WoodenButton label="Cook Something" size={22} width={"fit-content"} />
        //         </Link>
        //     </VStack>
        // </Flex>
        <VStack minHeight="92vh" style={{ background: "linear-gradient(180deg, #292929 50%, #0B0B0B 100%)" }}>
            <Box
                w="100%"
                h={lg ? 350 : 400}
                bg={"url(./images/banner.png)"}
                bgSize="cover"
                boxShadow="0px 8px 12px 5px rgba(0, 0, 0, 0.30)inset"
                style={{ borderBottom: "1px solid #868E96" }}
            >
                <Box bg="linear-gradient(180deg, rgba(255,255,255,0) -40%, rgba(0,0,0,1) 150%)" w="100%" h="100%">
                    <VStack px={4} justify="center" w="100%" h={"100%"} spacing={6}>
                        <Text m={0} fontSize={sm ? 30 : md ? 45 : 60} color="white" className="font-face-kg" align={"center"}>
                            Have a killer meme idea?
                        </Text>

                        <div
                            onClick={() => {
                                if (!wallet.connected) {
                                    handleConnectWallet();
                                } else {
                                    isHomePageOnly
                                        ? toast.info("Coming Soon")
                                        : network === "devnet"
                                          ? router.push("/launch?network=devnet")
                                          : router.push("/collection");
                                }
                            }}
                        >
                            <WoodenButton label="Start Cooking" size={28} />
                        </div>
                    </VStack>
                </Box>
            </Box>

            <HStack
                spacing={sm ? 75 : 125}
                align="center"
                justify="center"
                w="100%"
                style={{ flexGrow: 1, flexDirection: sm ? "column" : "row" }}
                mt={50}
                pb={75}
                wrap="wrap"
            >
                <HStack justify="center" spacing={sm ? 75 : 125} style={{ flexDirection: sm ? "column" : "row" }}>
                    <VStack spacing={15}>
                        <Image src={botProof} width={sm ? 150 : 180} height={sm ? 150 : 180} alt="Bot Proof Vector" />
                        <Text m={0} fontFamily="ReemKufiRegular" fontSize={"xx-large"} color="white" align="center">
                            Bot-proof Liquidity
                        </Text>
                    </VStack>

                    <VStack spacing={15}>
                        <VStack justify="center" w={sm ? 150 : 180} h={sm ? 150 : 180}>
                            <Text m={0} fontFamily="ReemKufiRegular" fontSize={"xxx-large"} color="white" align="center">
                                ZERO
                            </Text>
                        </VStack>

                        <Text m={0} fontFamily="ReemKufiRegular" fontSize={"xx-large"} color="white" align="center">
                            Upfront Fees
                        </Text>
                    </VStack>

                    <VStack spacing={15}>
                        <Image src={mintInsurance} width={sm ? 150 : 180} height={sm ? 150 : 180} alt="Mint Insurance Vector" />
                        <Text m={0} fontFamily="ReemKufiRegular" fontSize={"xx-large"} color="white" align="center">
                            Mint Insurance
                        </Text>
                    </VStack>
                </HStack>

                <HStack justify="center" spacing={sm ? 75 : 125} style={{ flexDirection: sm ? "column" : "row" }}>
                    <VStack spacing={15}>
                        <Image src={coins} width={sm ? 150 : 180} height={sm ? 150 : 180} alt="Bot Proof Vector" />
                        <Text m={0} fontFamily="ReemKufiRegular" fontSize={"xx-large"} color="white" align="center">
                            1-Click Safe LP Deployment
                        </Text>
                    </VStack>
                    <VStack spacing={15}>
                        <Image src={stock} width={sm ? 150 : 180} height={sm ? 150 : 180} alt="Bot Proof Vector" />
                        <Text m={0} fontFamily="ReemKufiRegular" fontSize={"xx-large"} color="white" align="center">
                            Market Making Rewards
                        </Text>
                    </VStack>
                    <VStack spacing={15}>
                        <HStack h={sm ? 150 : 180} w={sm ? 150 : 180}>
                            <Image src="/images/thumbs-up.svg" width={130} height={130} alt="Thumbs Up" />{" "}
                            <Image src="/images/thumbs-down.svg" width={130} height={130} alt="Thumbs Down" />
                        </HStack>
                        <Text m={0} fontFamily="ReemKufiRegular" fontSize={"xx-large"} color="white" align="center">
                            Community Ratings
                        </Text>
                    </VStack>
                </HStack>
            </HStack>
        </VStack>
    );
};

export default EmptyLaunch;
