import {
    Center,
    VStack,
    Text,
    Box,
    HStack,
    Flex,
    Tooltip,
    Checkbox,
    Input,
    Button,
    useNumberInput,
    Progress,
    Divider,
} from "@chakra-ui/react";
import { LaunchData, bignum_to_num, myU64, JoinData, request_raw_account_data } from "../../components/Solana/state";
import { PROGRAM, RPC_NODE, WSS_NODE } from "../../components/Solana/constants";
import { useCallback, useEffect, useState, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
import { MdOutlineContentCopy } from "react-icons/md";
import { PieChart } from "react-minimal-pie-chart";
import { useRouter } from "next/router";
import Image from "next/image";
import twitter from "../../public/socialIcons/twitter.svg";
import telegram from "../../public/socialIcons/telegram.svg";
import website from "../../public/socialIcons/website.svg";
import Link from "next/link";
import useResponsive from "../../hooks/useResponsive";
import UseWalletConnection from "../../hooks/useWallet";
import trimAddress from "../../hooks/trimAddress";
import WoodenButton from "../../components/Buttons/woodenButton";
import PageNotFound from "../../components/pageNotFound";
import useCheckTickets from "../../hooks/useCheckTickets";
import useBuyTickets from "../../hooks/useBuyTickets";
import useClaimTickets from "../../hooks/useClaimTokens";
import useRefundTickets from "../../hooks/useRefundTickets";
import Links from "../../components/Buttons/links";

const MintPage = () => {
    const router = useRouter();
    const wallet = useWallet();
    const { xs, sm, md, lg } = useResponsive();
    const { handleConnectWallet } = UseWalletConnection();

    const [totalCost, setTotalCost] = useState(0);
    const [ticketPrice, setTicketPrice] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    const [launchData, setLaunchData] = useState<LaunchData | null>(null);
    const [join_data, setJoinData] = useState<JoinData | null>(null);

    const { getInputProps, getIncrementButtonProps, getDecrementButtonProps } = useNumberInput({
        step: 1,
        defaultValue: 1,
        min: 1,
        max: 100,
    });

    const inc = getIncrementButtonProps();
    const dec = getDecrementButtonProps();
    const input = getInputProps();

    const { value } = input;

    const { BuyTickets } = useBuyTickets({ launchData, value });
    const { CheckTickets } = useCheckTickets(launchData);
    const { ClaimTokens } = useClaimTickets(launchData);
    const { RefundTickets } = useRefundTickets(launchData);

    const checkLaunchData = useRef<boolean>(true);

    const { pageName } = router.query;

    // updates to token page are checked using a websocket to get real time updates
    const join_account_ws_id = useRef<number | null>(null);
    const launch_account_ws_id = useRef<number | null>(null);

    // when page unloads unsub from any active websocket listeners
    useEffect(() => {
        return () => {
            console.log("in use effect return");
            const unsub = async () => {
                const connection = new Connection(RPC_NODE, { wsEndpoint: WSS_NODE });
                if (join_account_ws_id.current !== null) {
                    await connection.removeAccountChangeListener(join_account_ws_id.current);
                    join_account_ws_id.current = null;
                }
                if (launch_account_ws_id.current !== null) {
                    await connection.removeAccountChangeListener(launch_account_ws_id.current);
                    launch_account_ws_id.current = null;
                }
                await connection.removeAccountChangeListener(launch_account_ws_id.current);
              }
              unsub();
        };
      }, []); 

      
    const check_launch_update = useCallback(
        async (result: any) => {
            console.log(result);
            // if we have a subscription field check against ws_id

            let event_data = result.data;

            console.log("have event data", event_data, launch_account_ws_id.current);
            let account_data = Buffer.from(event_data, "base64");

            const [updated_data] = LaunchData.struct.deserialize(account_data);

            console.log(updated_data);

            if (updated_data.num_interactions > launchData.num_interactions) {
                setLaunchData(updated_data);
            }
        },
        [launchData],
    );

    const check_join_update = useCallback(
        async (result: any) => {
            console.log(result);
            // if we have a subscription field check against ws_id

            let event_data = result.data;

            console.log("have event data", event_data, join_account_ws_id.current);
            let account_data = Buffer.from(event_data, "base64");
            try {
                const [updated_data] = JoinData.struct.deserialize(account_data);

                console.log(updated_data);

                if (join_data === null) {
                    setJoinData(updated_data);
                    return;
                }

                if (updated_data.num_tickets > join_data.num_tickets || updated_data.num_claimed_tickets > join_data.num_claimed_tickets) {
                    setJoinData(updated_data);
                }
            } catch (error) {
                console.log("error reading join data");
                setJoinData(null);
            }
        },
        [join_data],
    );

    // launch account subscription handler
    useEffect(() => {
        if (launchData === null) return;

        const connection = new Connection(RPC_NODE, { wsEndpoint: WSS_NODE });

        if (launch_account_ws_id.current === null) {
            console.log("subscribe 1");
            let launch_data_account = PublicKey.findProgramAddressSync(
                [Buffer.from(launchData.page_name), Buffer.from("Launch")],
                PROGRAM,
            )[0];

            launch_account_ws_id.current = connection.onAccountChange(launch_data_account, check_launch_update, "confirmed");
        }

        if (join_account_ws_id.current === null && wallet !== null && wallet.publicKey !== null) {
            console.log("subscribe 2");
            const game_id = new myU64(launchData.game_id);
            const [game_id_buf] = myU64.struct.serialize(game_id);

            let user_join_account = PublicKey.findProgramAddressSync(
                [wallet.publicKey.toBytes(), game_id_buf, Buffer.from("Joiner")],
                PROGRAM,
            )[0];

            join_account_ws_id.current = connection.onAccountChange(user_join_account, check_join_update, "confirmed");
        }

        
    }, [wallet, launchData, check_join_update, check_launch_update]);

    let win_prob = 0;

    //if (join_data === null) {
    //    console.log("no joiner info");
    // }

    if (launchData !== null && launchData.tickets_sold > launchData.tickets_claimed) {
        //console.log("joiner", bignum_to_num(join_data.game_id), bignum_to_num(launchData.game_id));
        win_prob = (launchData.num_mints - launchData.mints_won) / (launchData.tickets_sold - launchData.tickets_claimed);
    }

    const fetchLaunchData = useCallback(async () => {
        if (!checkLaunchData.current) return;
        if (pageName === undefined || pageName === null) {
            setIsLoading(false); // Set isLoading to false when pageName is undefined or null
            return;
        }

        setIsLoading(true);

        let new_launch_data: [LaunchData | null, number] = [launchData, 0];

        if (launchData === null) {
            try {
                let page_name = pageName ? pageName : "";
                let launch_data_account = PublicKey.findProgramAddressSync(
                    [Buffer.from(page_name.toString()), Buffer.from("Launch")],
                    PROGRAM,
                )[0];

                const launch_account_data = await request_raw_account_data("", launch_data_account);

                new_launch_data = LaunchData.struct.deserialize(launch_account_data);

                //console.log(new_launch_data);

                setLaunchData(new_launch_data[0]);
            } catch (error) {
                console.error("Error fetching launch data:", error);
            }
        }

        if (wallet === null || wallet.publicKey === null) {
            setIsLoading(false);
            return;
        }

        const game_id = new myU64(new_launch_data[0]?.game_id);
        const [game_id_buf] = myU64.struct.serialize(game_id);

        let user_join_account = PublicKey.findProgramAddressSync(
            [wallet.publicKey.toBytes(), game_id_buf, Buffer.from("Joiner")],
            PROGRAM,
        )[0];

        if (join_data === null) {
            //console.log("check join data")
            try {
                const join_account_data = await request_raw_account_data("", user_join_account);

                if (join_account_data === null) {
                    setIsLoading(false);
                    checkLaunchData.current = false;
                    return;
                }

                const [new_join_data] = JoinData.struct.deserialize(join_account_data);

                console.log(new_join_data);

                setJoinData(new_join_data);
            } catch (error) {
                console.error("Error fetching join data:", error);
                setIsLoading(false);
                checkLaunchData.current = false;
            }
        }
        checkLaunchData.current = false;
        setIsLoading(false);
    }, [wallet, pageName, launchData, join_data]);

    useEffect(() => {
        checkLaunchData.current = true;
    }, [wallet]);

    useEffect(() => {
        fetchLaunchData();
    }, [fetchLaunchData, pageName]);

    useEffect(() => {
        if (launchData) {
            setTicketPrice(bignum_to_num(launchData.ticket_price) / LAMPORTS_PER_SOL);
        }
    }, [launchData]);

    useEffect(() => {
        if (launchData) {
            setTotalCost(value * ticketPrice);
        }
    }, [value, ticketPrice, launchData]);

    if (!pageName) return;

    if (isLoading)
        return (
            <HStack justify="center" style={{ background: "linear-gradient(180deg, #292929 50%, #0B0B0B 100%)", height: "90vh" }}>
                <Text color="white" fontSize="xx-large">
                    Prepping on-chain ingredients...
                </Text>
            </HStack>
        );

    if (!launchData) return <PageNotFound />;

    const distribution = launchData.distribution
        ? launchData.distribution
              .map((value, index) => ({
                  title: ["Let's Cook Raffle", "Liquidity Pool", "LP Rewards", "Airdrops", "Team", "Others"][index],
                  value,
                  color: ["#FF5151", "#489CFF", "#74DD5A", "#FFEF5E", "#B96CF6", "#FF994E"][index],
              }))
              .filter((item) => item.value > 0)
        : [];

    let splitLaunchDate = new Date(bignum_to_num(launchData.launch_date)).toUTCString().split(" ");
    let launchDate = splitLaunchDate[0] + " " + splitLaunchDate[1] + " " + splitLaunchDate[2] + " " + splitLaunchDate[3];
    let splitLaunchTime = splitLaunchDate[4].split(":");
    let launchTime = splitLaunchTime[0] + ":" + splitLaunchTime[1] + " " + splitLaunchDate[5];

    let splitEndDate = new Date(bignum_to_num(launchData.end_date)).toUTCString().split(" ");
    let endDate = splitEndDate[0] + " " + splitEndDate[1] + " " + splitEndDate[2] + " " + splitEndDate[3];
    let splitEndTime = splitEndDate[4].split(":");
    let endTime = splitEndTime[0] + ":" + splitEndTime[1] + " " + splitEndDate[5];

    let one_mint = (bignum_to_num(launchData.total_supply) * (launchData.distribution[0] / 100)) / launchData.num_mints;
    let one_mint_frac = one_mint / bignum_to_num(launchData.total_supply);
    let current_time = new Date().getTime();

    const enum CookState {
        PRE_LAUNCH,
        ACTIVE_NO_TICKETS,
        ACTIVE_TICKETS,
        MINT_FAILED_NOT_REFUNDED,
        MINT_FAILED_REFUNDED,
        MINT_SUCCEEDED_NO_TICKETS,
        MINT_SUCCEDED_TICKETS_LEFT,
        MINT_SUCCEEDED_TICKETS_CHECKED,
    }

    let cook_state = CookState.PRE_LAUNCH;
    if (current_time >= launchData.launch_date && current_time < launchData.end_date && join_data === null) {
        cook_state = CookState.ACTIVE_NO_TICKETS;
    }
    if (current_time >= launchData.launch_date && current_time < launchData.end_date && join_data !== null) {
        cook_state = CookState.ACTIVE_TICKETS;
    }
    if (current_time >= launchData.end_date && launchData.tickets_sold < launchData.num_mints && join_data === null) {
        cook_state = CookState.MINT_FAILED_REFUNDED;
    }
    if (current_time >= launchData.end_date && launchData.tickets_sold < launchData.num_mints && join_data !== null) {
        cook_state = CookState.MINT_FAILED_NOT_REFUNDED;
    }
    if (current_time >= launchData.end_date && launchData.tickets_sold >= launchData.num_mints && join_data === null) {
        cook_state = CookState.MINT_SUCCEEDED_NO_TICKETS;
    }
    if (
        current_time >= launchData.end_date &&
        launchData.tickets_sold >= launchData.num_mints &&
        join_data !== null &&
        join_data.num_claimed_tickets < join_data.num_tickets
    ) {
        cook_state = CookState.MINT_SUCCEDED_TICKETS_LEFT;
    }
    if (
        current_time >= launchData.end_date &&
        launchData.tickets_sold >= launchData.num_mints &&
        join_data !== null &&
        join_data.num_claimed_tickets == join_data.num_tickets
    ) {
        cook_state = CookState.MINT_SUCCEEDED_TICKETS_CHECKED;
    }

    const ACTIVE: boolean = cook_state === CookState.ACTIVE_NO_TICKETS || cook_state === CookState.ACTIVE_TICKETS;
    const MINTED_OUT: boolean =
        cook_state === CookState.MINT_SUCCEEDED_NO_TICKETS ||
        cook_state === CookState.MINT_SUCCEDED_TICKETS_LEFT ||
        cook_state === CookState.MINT_SUCCEEDED_TICKETS_CHECKED;
    const MINT_FAILED: boolean = cook_state === CookState.MINT_FAILED_NOT_REFUNDED || cook_state === CookState.MINT_FAILED_REFUNDED;

    return (
        <main style={{ background: "linear-gradient(180deg, #292929 10%, #0B0B0B 100%)" }}>
            <Center>
                <VStack spacing={3} px={sm ? 3 : 0} my={xs ? "25px" : "50px"} width={sm ? "100%" : "80%"}>
                    <VStack>
                        {/* Token Logo - Mobile View  */}
                        <Image
                            src={launchData.icon}
                            width={200}
                            height={200}
                            alt={`${launchData.name} LOGO`}
                            hidden={!md}
                            style={{ borderRadius: "50%" }}
                        />

                        {/* Token Name  */}
                        <Text m={0} fontSize={md ? 35 : 60} color="white" className="font-face-kg">
                            ${launchData.name}
                        </Text>

                        <HStack spacing={3} align="center" justify="center">
                            {/* Contract Address  */}
                            <Text m={0} color={"white"} fontFamily="ReemKufiRegular" fontSize={sm ? "large" : "x-large"}>
                                {md ? trimAddress(launchData.mint_address.toString()) : launchData.mint_address.toString()}
                            </Text>

                            {/* Copy Button for Contract Address  */}
                            <Tooltip label="Copy Contract Address" hasArrow fontSize="large" offset={[0, 10]}>
                                <div
                                    style={{ cursor: "pointer" }}
                                    onClick={() => navigator.clipboard.writeText(launchData.mint_address.toString())}
                                >
                                    <MdOutlineContentCopy color="white" size={sm ? 25 : 40} />
                                </div>
                            </Tooltip>

                            {/* Solscan Link */}
                            <Tooltip label="View in explorer" hasArrow fontSize="large" offset={[0, 10]}>
                                <Link
                                    href={`https://solscan.io/account/${launchData.mint_address.toString()}?cluster=devnet`}
                                    target="_blank"
                                >
                                    <Image src="/images/solscan.png" width={sm ? 25 : 40} height={sm ? 30 : 40} alt="Solscan icon" />
                                </Link>
                            </Tooltip>
                        </HStack>
                    </VStack>

                    <Flex
                        w={md ? "fit-content" : 1024}
                        flexDirection={md ? "column" : "row"}
                        align="center"
                        justify={md ? "center" : "space-between"}
                        h="100%"
                    >
                        <HStack w="fit-content" gap={5}>
                            {/* Token Logo - Desktop View  */}
                            <Image
                                src={launchData.icon}
                                width={md ? 130 : 200}
                                height={md ? 130 : 200}
                                alt="$SAUCE LOGO"
                                hidden={md}
                                style={{ borderRadius: "50%" }}
                            />

                            {/* Token Description and Social Links  */}
                            <VStack gap={md ? 1 : 2} alignItems={md ? "center" : "left"}>
                                <Text
                                    fontFamily="ReemKufiRegular"
                                    fontSize={sm ? "large" : "x-large"}
                                    color="white"
                                    maxW={sm ? "100%" : md ? "600px" : "850px"}
                                    mr={md ? 0 : 25}
                                    lineHeight={1.15}
                                    align={md ? "center" : "start"}
                                    m={0}
                                >
                                    {launchData.description}
                                </Text>
                                <HStack mt={3} hidden={sm}>
                                    {!md && <Links featuredLaunch={launchData}/>}
                                </HStack>
                            </VStack>
                        </HStack>
                    </Flex>

                    {/* Open & Close Date  */}
                    <HStack mt={xs ? 5 : 0} spacing={5}>
                        <Text m={0} color={"white"} fontFamily="ReemKufiRegular" align={"center"} fontSize={md ? "large" : "xx-large"}>
                            Opens: {launchDate}
                            <br />
                            {launchTime}
                        </Text>
                        <Divider orientation="vertical" height={md ? 50 : lg ? 75 : 50} color="white" />
                        <Text m={0} color={"white"} fontFamily="ReemKufiRegular" align={"center"} fontSize={md ? "large" : "xx-large"}>
                            Closes: {endDate}
                            <br />
                            {endTime}
                        </Text>
                    </HStack>

                    <VStack
                        gap={50}
                        p={md ? 25 : 50}
                        bg="rgba(255, 255, 255, 0.20)"
                        borderRadius={12}
                        border="1px solid white"
                        h="fit-content"
                        mx={3}
                    >
                        <Flex w="100%" gap={xs ? 50 : lg ? 45 : 100} justify="space-between" direction={md ? "column" : "row"}>
                            <VStack align="start" gap={xs ? 3 : 5}>
                                <HStack>
                                    <Text m="0" color="white" fontSize="x-large" fontFamily="ReemKufiRegular">
                                        Price per ticket: {bignum_to_num(launchData.ticket_price) / LAMPORTS_PER_SOL}
                                    </Text>
                                    <Image src="/images/sol.png" width={30} height={30} alt="SOL Icon" style={{ marginLeft: -3 }} />
                                </HStack>

                                <Text m="0" color="white" fontSize="x-large" fontFamily="ReemKufiRegular">
                                    Total Winning Tickets: {launchData.mints_won}
                                </Text>

                                <Text m="0" color="white" fontSize="x-large" fontFamily="ReemKufiRegular">
                                    Tokens Per Winning Ticket: {one_mint} <br />({one_mint_frac}% of total supply)
                                </Text>

                                <HStack align="center" gap={3}>
                                    <Text m="0" color="white" fontSize="x-large" fontFamily="ReemKufiRegular">
                                        Auto Refund:
                                    </Text>
                                    <Checkbox size="lg" isChecked colorScheme="green" />
                                    <Tooltip
                                        label="You will get a refund if liquidity threshhold is not reached."
                                        hasArrow
                                        w={270}
                                        fontSize="large"
                                        offset={[0, 10]}
                                    >
                                        <Image width={25} height={25} src="/images/help.png" alt="Help" />
                                    </Tooltip>
                                </HStack>
                            </VStack>

                            <VStack align="center" justify="center" gap={3}>
                                <HStack>
                                    <Text
                                        m="0"
                                        color="white"
                                        className="font-face-kg"
                                        textAlign={"center"}
                                        fontSize={lg ? "x-large" : "xxx-large"}
                                    >
                                        {cook_state === CookState.PRE_LAUNCH
                                            ? "Warming Up"
                                            : ACTIVE
                                              ? `Total: ${totalCost}`
                                              : MINTED_OUT
                                                ? "Cooked Out!"
                                                : MINT_FAILED
                                                  ? "Cook Failed"
                                                  : "none"}
                                    </Text>
                                    {ACTIVE && <Image src="/images/sol.png" width={40} height={40} alt="SOL Icon" />}
                                </HStack>

                                <Box
                                    mt={-3}
                                    onClick={() => {
                                        if (wallet.publicKey === null) {
                                            handleConnectWallet();
                                        } else {
                                            cook_state === CookState.MINT_FAILED_NOT_REFUNDED
                                                ? () => RefundTickets()
                                                : cook_state === CookState.MINT_SUCCEDED_TICKETS_LEFT
                                                  ? () => CheckTickets()
                                                  : cook_state === CookState.MINT_SUCCEEDED_TICKETS_CHECKED
                                                    ? () => ClaimTokens()
                                                    : () => {};
                                        }
                                    }}
                                >
                                    {(MINTED_OUT || MINT_FAILED) && (
                                        <VStack>
                                            <Box mt={4}>
                                                <WoodenButton
                                                    // pass action here (check tickets / refund tickets)
                                                    label={
                                                        cook_state === CookState.MINT_SUCCEDED_TICKETS_LEFT
                                                            ? "Check Tickets"
                                                            : cook_state === CookState.MINT_SUCCEEDED_TICKETS_CHECKED
                                                              ? "Claim Tokens"
                                                              : cook_state === CookState.MINT_FAILED_NOT_REFUNDED
                                                                ? "Refund Tickets"
                                                                : ""
                                                    }
                                                    size={28}
                                                />
                                            </Box>
                                            {MINTED_OUT && (
                                                <Text m="0" color="white" fontSize="x-large" fontFamily="ReemKufiRegular">
                                                    {(100 * win_prob).toFixed(3)}% chance per ticket
                                                </Text>
                                            )}
                                        </VStack>
                                    )}
                                </Box>

                                {/* Mint Quantity  */}
                                <HStack maxW="320px" hidden={MINTED_OUT || MINT_FAILED}>
                                    <Button {...dec} size="lg" isDisabled={cook_state === CookState.PRE_LAUNCH}>
                                        -
                                    </Button>

                                    <Input
                                        {...input}
                                        size="lg"
                                        fontSize="x-large"
                                        color="white"
                                        alignItems="center"
                                        justifyContent="center"
                                        isDisabled={cook_state === CookState.PRE_LAUNCH}
                                    />
                                    <Button {...inc} size="lg" isDisabled={cook_state === CookState.PRE_LAUNCH}>
                                        +
                                    </Button>
                                </HStack>

                                {/* Mint Button  */}
                                <Button
                                    size="lg"
                                    isDisabled={cook_state === CookState.PRE_LAUNCH}
                                    hidden={MINTED_OUT || MINT_FAILED}
                                    onClick={() => {
                                        BuyTickets();
                                    }}
                                >
                                    {wallet.publicKey === null ? "Connect Wallet" : "Mint"}
                                </Button>

                                {/* Platform fee  */}
                                {!(cook_state === CookState.PRE_LAUNCH) ? (
                                    <VStack hidden={MINTED_OUT || MINT_FAILED}>
                                        <HStack>
                                            <Text m="0" color="white" fontSize="x-large" fontFamily="ReemKufiRegular">
                                                Platform fee: 0.01
                                            </Text>
                                            <Image src="/images/sol.png" width={30} height={30} alt="SOL Icon" style={{ marginLeft: -3 }} />
                                        </HStack>
                                        <Text m="0" mt={-3} color="white" fontSize="x-large" fontFamily="ReemKufiRegular">
                                            per ticket
                                        </Text>
                                    </VStack>
                                ) : (
                                    <Text m="0" color="white" fontSize="large" fontFamily="ReemKufiRegular">
                                        Tickets are not yet available for purchase.
                                    </Text>
                                )}
                            </VStack>
                        </Flex>

                        <VStack w={xs ? "100%" : "85%"}>
                            {/* Mint Progress  */}
                            <Progress
                                hasStripe={MINTED_OUT}
                                mb={2}
                                w="100%"
                                h={25}
                                borderRadius={12}
                                colorScheme={
                                    cook_state === CookState.PRE_LAUNCH
                                        ? "none"
                                        : ACTIVE
                                          ? "whatsapp"
                                          : MINTED_OUT
                                            ? "linkedin"
                                            : MINT_FAILED
                                              ? "red"
                                              : "none"
                                }
                                size="sm"
                                value={(100 * Math.min(launchData.tickets_sold, launchData.num_mints)) / launchData.num_mints}
                            />

                            {/* Total tickets sold  */}
                            <Text m="0" color="white" fontSize="x-large" fontFamily="ReemKufiRegular">
                                Tickets Sold: {launchData.tickets_sold}
                            </Text>
                            {/* Liquidity  */}
                            <Flex direction={md ? "column" : "row"}>
                                <Text m="0" color="white" fontSize="x-large" fontFamily="ReemKufiRegular">
                                    Guaranteed Liquidity:
                                </Text>
                                <HStack justify="center">
                                    <Text m="0" color="white" fontSize="x-large" fontFamily="ReemKufiRegular">
                                        &nbsp;
                                        {(Math.min(launchData.num_mints, launchData.tickets_sold) * launchData.ticket_price) /
                                            LAMPORTS_PER_SOL}
                                        /{(launchData.num_mints * launchData.ticket_price) / LAMPORTS_PER_SOL}
                                    </Text>
                                    <Image src="/images/sol.png" width={30} height={30} alt="SOL Icon" style={{ marginLeft: -3 }} />
                                </HStack>
                            </Flex>
                        </VStack>
                    </VStack>

                    {/* Token Distribution  */}
                    <VStack w="100%" mt={12}>
                        <Text m={0} fontSize={md ? "xl" : 30} color="white" className="font-face-kg">
                            Distribution
                        </Text>
                        <HStack align="center" justify="center" style={{ cursor: "pointer" }}>
                            {/* Token Supply  */}
                            <Text m={0} color={"white"} fontFamily="ReemKufiRegular" fontSize={md ? "large" : "x-large"}>
                                Total Supply: {bignum_to_num(launchData.total_supply)}
                            </Text>
                        </HStack>

                        <Flex align="center" justify="center" flexDirection={md ? "column" : "row"} w="100%" gap={xs ? 3 : 12} mt={3}>
                            <VStack gap={6} align="start">
                                {distribution.map((i) => {
                                    if (i.value <= 0) return;
                                    return (
                                        <HStack gap={4} key={i.title}>
                                            <Box borderRadius={6} bg={i.color} h={35} w={35} />{" "}
                                            <Text m={0} color={"white"} fontFamily="ReemKufiRegular" fontSize={md ? "large" : "x-large"}>
                                                {i.title} - {i.value}%
                                            </Text>
                                        </HStack>
                                    );
                                })}
                            </VStack>{" "}
                            <PieChart
                                animate={true}
                                totalValue={100}
                                data={distribution}
                                style={{ width: xs ? "100%" : "400px", height: "400px" }}
                            />
                        </Flex>
                    </VStack>
                </VStack>
            </Center>
        </main>
    );
};

export default MintPage;
