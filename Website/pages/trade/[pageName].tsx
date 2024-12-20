import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import Head from "next/head";
import {
    request_raw_account_data,
    UserData,
    request_current_balance,
    request_token_supply,
    uInt32ToLEBytes,
    MintData,
    ListingData,
    myU64,
} from "../../components/Solana/state";
import {
    TimeSeriesData,
    MMLaunchData,
    reward_schedule,
    AMMData,
    RaydiumAMM,
    getAMMKey,
    getAMMKeyFromMints,
    AMMPluginData,
    getAMMPlugins,
} from "../../components/Solana/jupiter_state";
import { Order } from "@jup-ag/limit-order-sdk";
import { bignum_to_num, request_token_amount, TokenAccount, RequestTokenHolders } from "../../components/Solana/state";
import { Config, PROGRAM, WRAPPED_SOL } from "../../components/Solana/constants";
import { useCallback, useEffect, useState, useRef } from "react";
import { PublicKey, Connection } from "@solana/web3.js";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, Mint, getTransferFeeConfig } from "@solana/spl-token";

import {
    HStack,
    VStack,
    Text,
    Box,
    Tooltip,
    Link,
    Modal,
    ModalBody,
    ModalContent,
    Input,
    ModalOverlay,
    useDisclosure,
} from "@chakra-ui/react";
import useResponsive from "../../hooks/useResponsive";
import Image from "next/image";
import { MdOutlineContentCopy } from "react-icons/md";
import { PiArrowsOutLineVerticalLight } from "react-icons/pi";
import WoodenButton from "../../components/Buttons/woodenButton";
import useAppRoot from "../../context/useAppRoot";
import { ColorType, createChart, CrosshairMode, LineStyle, UTCTimestamp } from "lightweight-charts";
import trimAddress from "../../utils/trimAddress";
import { FaChartLine, FaInfo, FaPowerOff } from "react-icons/fa";

import MyRewardsTable from "../../components/tables/myRewards";
import Links from "../../components/Buttons/links";
import { HypeVote } from "../../components/hypeVote";
import UseWalletConnection from "../../hooks/useWallet";
import ShowExtensions from "../../components/Solana/extensions";
import { getSolscanLink } from "../../utils/getSolscanLink";
import { IoMdSwap } from "react-icons/io";
import { FaPlusCircle } from "react-icons/fa";
import styles from "../../styles/Launch.module.css";

import { RaydiumCPMM } from "../../hooks/raydium/utils";
import useCreateCP, { getPoolStateAccount } from "../../hooks/raydium/useCreateCP";
import RemoveLiquidityPanel from "../../components/tradePanels/removeLiquidityPanel";
import AddLiquidityPanel from "../../components/tradePanels/addLiquidityPanel";
import SellPanel from "../../components/tradePanels/sellPanel";
import BuyPanel from "../../components/tradePanels/buyPanel";
import formatPrice from "../../utils/formatPrice";
import Loader from "../../components/loader";
import useAddTradeRewards from "../../hooks/cookAMM/useAddTradeRewards";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";

interface MarketData {
    time: UTCTimestamp;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

async function getBirdEyeData(sol_is_quote: boolean, setMarketData: any, market_address: string, setLastVolume: any) {
    // Default options are marked with *
    const options = { method: "GET", headers: { "X-API-KEY": "e819487c98444f82857d02612432a051" } };

    let today_seconds = Math.floor(new Date().getTime() / 1000);

    let start_time = new Date(2024, 0, 1).getTime() / 1000;

    let url =
        "https://public-api.birdeye.so/defi/ohlcv/pair?address=" +
        market_address +
        "&type=15m" +
        "&time_from=" +
        start_time +
        "&time_to=" +
        today_seconds;

    //console.log(url);
    let result = await fetch(url, options).then((response) => response.json());
    let items = result["data"]["items"];

    let now = new Date().getTime() / 1000;
    let last_volume = 0;
    let data: MarketData[] = [];
    for (let i = 0; i < items.length; i++) {
        let item = items[i];

        let open = sol_is_quote ? item.o : 1.0 / item.o;
        let high = sol_is_quote ? item.h : 1.0 / item.l;
        let low = sol_is_quote ? item.l : 1.0 / item.h;
        let close = sol_is_quote ? item.c : 1.0 / item.c;
        let volume = sol_is_quote ? item.v : item.v / close;
        data.push({ time: item.unixTime as UTCTimestamp, open: open, high: high, low: low, close: close, volume: volume });

        if (now - item.unixTime < 24 * 60 * 60) {
            last_volume += volume;
        }
    }
    //console.log(result, "last volume", last_volume);
    setMarketData(data);
    setLastVolume(last_volume);
    //return data;
}

function filterLaunchRewards(list: Map<string, MMLaunchData>, amm: AMMData) {
    if (list === null || list === undefined) return null;
    if (amm === null || amm === undefined) return null;

    let plugins: AMMPluginData = getAMMPlugins(amm);
    if (plugins.trade_reward_first_date === 0) return null;

    let current_date = Math.floor(new Date().getTime() / 1000 / 24 / 60 / 60) - plugins.trade_reward_first_date;
    let key = getAMMKey(amm, amm.provider);
    return list.get(key.toString() + "_" + current_date);
}

const TradePage = () => {
    const wallet = useWallet();
    const { connection } = useConnection();
    const router = useRouter();
    const { xs, sm, lg } = useResponsive();

    const { ammData, mmLaunchData, SOLPrice, mintData, listingData } = useAppRoot();

    const { pageName } = router.query;

    const [leftPanel, setLeftPanel] = useState("Info");

    const [additionalPixels, setAdditionalPixels] = useState(0);

    const [selectedTab, setSelectedTab] = useState("Rewards");

    const [mobilePageContent, setMobilePageContent] = useState("Chart");

    const handleClick = (tab: string) => {
        setSelectedTab(tab);
    };

    const [market_data, setMarketData] = useState<MarketData[]>([]);
    const [daily_data, setDailyData] = useState<MarketData[]>([]);

    const [last_day_volume, setLastDayVolume] = useState<number>(0);

    const [base_address, setBaseAddress] = useState<PublicKey | null>(null);
    const [quote_address, setQuoteAddress] = useState<PublicKey | null>(null);
    const [price_address, setPriceAddress] = useState<PublicKey | null>(null);
    const [user_base_address, setUserBaseAddress] = useState<PublicKey | null>(null);
    const [user_lp_address, setUserLPAddress] = useState<PublicKey | null>(null);
    const [raydium_address, setRaydiumAddress] = useState<PublicKey | null>(null);

    const [amm_base_amount, setBaseAmount] = useState<number | null>(null);
    const [amm_quote_amount, setQuoteAmount] = useState<number | null>(null);
    const [amm_lp_amount, setLPAmount] = useState<number | null>(null);

    const [user_base_amount, setUserBaseAmount] = useState<number>(0);
    const [user_lp_amount, setUserLPAmount] = useState<number>(0);

    const [total_supply, setTotalSupply] = useState<number>(0);

    const [listing, setListing] = useState<ListingData | null>(null);
    const [amm, setAMM] = useState<AMMData | null>(null);
    const [base_mint, setBaseMint] = useState<MintData | null>(null);
    const [sol_is_quote, setSOLIsQuote] = useState<boolean>(true);

    const base_ws_id = useRef<number | null>(null);
    const quote_ws_id = useRef<number | null>(null);
    const price_ws_id = useRef<number | null>(null);
    const user_base_token_ws_id = useRef<number | null>(null);
    const user_lp_token_ws_id = useRef<number | null>(null);
    const raydium_ws_id = useRef<number | null>(null);

    const last_base_amount = useRef<number>(0);
    const last_quote_amount = useRef<number>(0);

    const check_user_data = useRef<boolean>(true);
    const check_market_data = useRef<boolean>(true);

    // when page unloads unsub from any active websocket listeners
    useEffect(() => {
        return () => {
            //console.log("in use effect return");
            const unsub = async () => {
                if (base_ws_id.current !== null) {
                    await connection.removeAccountChangeListener(base_ws_id.current);
                    base_ws_id.current = null;
                }
                if (quote_ws_id.current !== null) {
                    await connection.removeAccountChangeListener(quote_ws_id.current);
                    quote_ws_id.current = null;
                }
            };
            unsub();
        };
    }, [connection]);

    useEffect(() => {
        if (ammData === null || listingData === null || mintData === null) return;

        let amm = ammData.get(pageName.toString());
        setAMM(amm);

        if (!amm) {
            return;
        }
        //console.log("accounts", amm.base_key.toString(), amm.quote_key.toString());
        let listing_key = PublicKey.findProgramAddressSync([amm.base_mint.toBytes(), Buffer.from("Listing")], PROGRAM)[0];
        let listing = listingData.get(listing_key.toString());
        setListing(listing);

        let base_mint = mintData.get(amm.base_mint.toString());
        setBaseMint(base_mint);
    }, [ammData, mintData, pageName, listingData]);

    useEffect(() => {
        if (amm_base_amount === null || amm_quote_amount === null) {
            return;
        }

        if (amm_base_amount === last_base_amount.current && amm_quote_amount === last_quote_amount.current) {
            return;
        }

        last_base_amount.current = amm_base_amount;
        last_quote_amount.current = amm_quote_amount;

        if (amm.provider === 0 || market_data.length === 0) {
            return;
        }

        // update market data using bid/ask
        let price = amm_quote_amount / amm_base_amount;

        price = (price * Math.pow(10, base_mint.mint.decimals)) / Math.pow(10, 9);

        let now_minute = Math.floor(new Date().getTime() / 1000 / 15 / 60);
        let last_candle = market_data[market_data.length - 1];
        let last_minute = last_candle.time / 15 / 60;
        //console.log("update price", price, last_minute, now_minute)

        if (now_minute > last_minute) {
            let new_candle: MarketData = {
                time: (now_minute * 15 * 60) as UTCTimestamp,
                open: price,
                high: price,
                low: price,
                close: price,
                volume: 0,
            };
            //console.log("new candle", now_minute, last_minute, new_candle)

            market_data.push(new_candle);
            setMarketData([...market_data]);
        } else {
            last_candle.close = price;
            if (price > last_candle.high) {
                last_candle.high = price;
            }
            if (price < last_candle.low) {
                last_candle.low = price;
            }
            //console.log("update old candle", last_candle)
            market_data[market_data.length - 1] = last_candle;
            setMarketData([...market_data]);
        }
    }, [amm_base_amount, amm_quote_amount, amm, market_data, base_mint]);

    const check_base_update = useCallback(async (result: any) => {
        //console.log(result);
        // if we have a subscription field check against ws_id

        let event_data = result.data;
        //console.log(event_data)
        const [amount_u64] = myU64.struct.deserialize(event_data.slice(64, 72));
        let amount = parseFloat(amount_u64.value.toString());
        console.log("base update", amount, amount_u64.value.toString());

        //console.log("update base amount", amount);
        setBaseAmount(amount);
    }, []);

    const check_quote_update = useCallback(async (result: any) => {
        //console.log(result.owner);
        // if we have a subscription field check against ws_id

        let event_data = result.data;
        const [amount_u64] = myU64.struct.deserialize(event_data.slice(64, 72));

        let amount = parseFloat(amount_u64.value.toString());
        console.log("quote update", amount, amount_u64.value.toString());

        //console.log("update quote amount", amount);

        setQuoteAmount(amount);
    }, []);

    const check_price_update = useCallback(
        async (result: any) => {
            //console.log(result);
            // if we have a subscription field check against ws_id

            let event_data = result.data;
            const [price_data] = TimeSeriesData.struct.deserialize(event_data);
            //console.log("updated price data", price_data);

            let data: MarketData[] = [];

            for (let i = 0; i < price_data.data.length; i++) {
                let item = price_data.data[i];
                let time = bignum_to_num(item.timestamp) * 60;

                let open = Buffer.from(item.open).readFloatLE(0);
                let high = Buffer.from(item.high).readFloatLE(0);
                let low = Buffer.from(item.low).readFloatLE(0);
                let close = Buffer.from(item.close).readFloatLE(0);
                let volume = bignum_to_num(item.volume) / Math.pow(10, base_mint.mint.decimals);

                data.push({ time: time as UTCTimestamp, open: open, high: high, low: low, close: close, volume: volume });
                //console.log("new data", data);
            }
            setMarketData(data);
        },
        [base_mint],
    );

    const check_user_token_update = useCallback(async (result: any) => {
        //console.log(result);
        // if we have a subscription field check against ws_id

        let event_data = result.data;
        const [token_account] = TokenAccount.struct.deserialize(event_data);
        let amount = bignum_to_num(token_account.amount);
        // console.log("update quote amount", amount);

        setUserBaseAmount(amount);
    }, []);

    const check_user_lp_update = useCallback(async (result: any) => {
        //console.log(result);
        // if we have a subscription field check against ws_id

        let event_data = result.data;
        const [token_account] = TokenAccount.struct.deserialize(event_data);
        let amount = bignum_to_num(token_account.amount);
        // console.log("update quote amount", amount);

        setUserLPAmount(amount);
    }, []);

    const check_raydium_update = useCallback(
        async (result: any) => {
            let event_data = result.data;
            if (amm.provider === 1) {
                const [poolState] = RaydiumCPMM.struct.deserialize(event_data);

                setLPAmount(bignum_to_num(poolState.lp_supply));
            }
            if (amm.provider === 2) {
                const [ray_pool] = RaydiumAMM.struct.deserialize(event_data);
                setLPAmount(bignum_to_num(ray_pool.lpReserve));
            }
        },
        [amm],
    );

    useEffect(() => {
        if (base_ws_id.current === null && base_address !== null) {
            //console.log("subscribe 1");

            base_ws_id.current = connection.onAccountChange(base_address, check_base_update, "confirmed");
        }

        if (quote_ws_id.current === null && quote_address !== null) {
            // console.log("subscribe 2");

            quote_ws_id.current = connection.onAccountChange(quote_address, check_quote_update, "confirmed");
        }

        if (price_ws_id.current === null && price_address !== null) {
            price_ws_id.current = connection.onAccountChange(price_address, check_price_update, "confirmed");
        }

        if (user_base_token_ws_id.current === null && user_base_address !== null) {
            user_base_token_ws_id.current = connection.onAccountChange(user_base_address, check_user_token_update, "confirmed");
        }
        if (user_lp_token_ws_id.current === null && user_lp_address !== null) {
            user_lp_token_ws_id.current = connection.onAccountChange(user_lp_address, check_user_lp_update, "confirmed");
        }
        if (raydium_ws_id.current === null && raydium_address !== null) {
            raydium_ws_id.current = connection.onAccountChange(raydium_address, check_raydium_update, "confirmed");
        }
    }, [
        connection,
        base_address,
        quote_address,
        price_address,
        user_base_address,
        user_lp_address,
        raydium_address,
        check_price_update,
        check_base_update,
        check_quote_update,
        check_user_token_update,
        check_user_lp_update,
        check_raydium_update,
    ]);

    const CheckMarketData = useCallback(async () => {
        if (!amm || !base_mint) return;

        const token_mint = amm.base_mint;
        const wsol_mint = amm.quote_mint;

        let base_amm_account = amm.base_key;
        let quote_amm_account = amm.quote_key;
        let lp_mint = amm.lp_mint;

        //console.log("base key", base_amm_account.toString());

        // console.log(base_amm_account.toString(), quote_amm_account.toString());

        if (check_user_data.current === true) {
            if (wallet !== null && wallet.publicKey !== null) {
                let user_base_token_account_key = await getAssociatedTokenAddress(
                    token_mint, // mint
                    wallet.publicKey, // owner
                    true, // allow owner off curve
                    base_mint.token_program,
                );

                let user_lp_token_account_key = await getAssociatedTokenAddress(
                    lp_mint, // mint
                    wallet.publicKey, // owner
                    true, // allow owner off curve
                    amm.provider === 0 ? base_mint.token_program : TOKEN_PROGRAM_ID,
                );

                setUserBaseAddress(user_base_token_account_key);
                setUserLPAddress(user_lp_token_account_key);

                let user_base_amount = await request_token_amount("", user_base_token_account_key);
                let user_lp_amount = await request_token_amount("", user_lp_token_account_key);
                //console.log("user lp amount", user_lp_amount, user_lp_token_account_key.toString());
                setUserBaseAmount(user_base_amount);
                setUserLPAmount(user_lp_amount);

                check_user_data.current = false;
            }
        }

        if (check_market_data.current === true) {
            setBaseAddress(base_amm_account);
            setQuoteAddress(quote_amm_account);

            //console.log("base mint", base_mint.mint.address.toString(), wsol_mint.toString());
            //console.log("base key", base_amm_account.toString(), quote_amm_account.toString());

            let base_amount = await request_token_amount("", base_amm_account);
            let quote_amount = await request_token_amount("", quote_amm_account);

            //console.log("amm amounts", base_amount, quote_amount);
            //console.log("amm internal amounts", amm.amm_base_amount.toString(), amm.amm_quote_amount.toString());
            //console.log("price", (quote_amount/1e9) / (base_amount / Math.pow(10, base_mint.mint.decimals)));
            setBaseAmount(base_amount);
            setQuoteAmount(quote_amount);

            let total_supply = await request_token_supply("", token_mint);
            setTotalSupply(total_supply / Math.pow(10, base_mint.mint.decimals));

            if (amm.provider > 0) {
                let sol_is_quote: boolean = true;
                let pool_account = amm.pool;
                setRaydiumAddress(pool_account);

                if (amm.provider === 1) {
                    let pool_state_account = await connection.getAccountInfo(pool_account);
                    //console.log(pool_state_account);
                    const [poolState] = RaydiumCPMM.struct.deserialize(pool_state_account.data);
                    //console.log(poolState);
                    setLPAmount(bignum_to_num(poolState.lp_supply));
                }

                if (amm.provider === 2) {
                    let pool_data = await request_raw_account_data("", pool_account);
                    const [ray_pool] = RaydiumAMM.struct.deserialize(pool_data);

                    if (ray_pool.quoteMint.equals(WRAPPED_SOL)) {
                        setSOLIsQuote(true);
                    } else {
                        sol_is_quote = false;
                        setSOLIsQuote(false);
                    }

                    setLPAmount(bignum_to_num(ray_pool.lpReserve));
                }
                //console.log("pool state", pool_state.toString())
                if (Config.PROD) {
                    await getBirdEyeData(sol_is_quote, setMarketData, pool_account.toString(), setLastDayVolume);
                }

                return;
            }

            let amm_seed_keys = [];
            if (token_mint.toString() < wsol_mint.toString()) {
                amm_seed_keys.push(token_mint);
                amm_seed_keys.push(wsol_mint);
            } else {
                amm_seed_keys.push(wsol_mint);
                amm_seed_keys.push(token_mint);
            }

            let amm_data_account = PublicKey.findProgramAddressSync(
                [amm_seed_keys[0].toBytes(), amm_seed_keys[1].toBytes(), Buffer.from(amm.provider === 0 ? "CookAMM" : "RaydiumCPMM")],
                PROGRAM,
            )[0];

            setLPAmount(amm.lp_amount);

            let index_buffer = uInt32ToLEBytes(0);
            let price_data_account = PublicKey.findProgramAddressSync(
                [amm_data_account.toBytes(), index_buffer, Buffer.from("TimeSeries")],
                PROGRAM,
            )[0];

            setPriceAddress(price_data_account);

            let price_data_buffer = await request_raw_account_data("", price_data_account);
            //console.log(price_data_buffer);
            const [price_data] = TimeSeriesData.struct.deserialize(price_data_buffer);

            //console.log(price_data.data);
            let data: MarketData[] = [];
            let daily_data: MarketData[] = [];

            let now = new Date().getTime() / 1000;
            let last_volume = 0;

            let last_date = -1;
            for (let i = 0; i < price_data.data.length; i++) {
                let item = price_data.data[i];
                let time = bignum_to_num(item.timestamp) * 60;
                let date = Math.floor(time / 24 / 60 / 60) * 24 * 60 * 60;

                let open = Buffer.from(item.open).readFloatLE(0);
                let high = Buffer.from(item.high).readFloatLE(0);
                let low = Buffer.from(item.low).readFloatLE(0);
                let close = Buffer.from(item.close).readFloatLE(0);
                let volume = Buffer.from(item.volume).readFloatLE(0);
                //console.log("price data", time, open, high, low, close, volume);
                if (now - time < 24 * 60 * 60) {
                    last_volume += volume;
                }

                data.push({ time: time as UTCTimestamp, open: open, high: high, low: low, close: close, volume: volume });

                if (date !== last_date) {
                    daily_data.push({ time: date as UTCTimestamp, open: open, high: high, low: low, close: close, volume: volume });
                    last_date = date;
                } else {
                    daily_data[daily_data.length - 1].high =
                        high > daily_data[daily_data.length - 1].high ? high : daily_data[daily_data.length - 1].high;
                    daily_data[daily_data.length - 1].low =
                        low < daily_data[daily_data.length - 1].low ? low : daily_data[daily_data.length - 1].low;
                    daily_data[daily_data.length - 1].close = close;
                    daily_data[daily_data.length - 1].volume += volume;
                }
            }
            setMarketData(data);
            setDailyData(daily_data);
            setLastDayVolume(last_volume);
            check_market_data.current = false;
        }
    }, [amm, base_mint, wallet, connection]);

    useEffect(() => {
        CheckMarketData();
    }, [CheckMarketData]);

    const handleMouseDown = () => {
        document.addEventListener("mousemove", handleMouseMove);

        document.addEventListener("mouseup", () => {
            document.removeEventListener("mousemove", handleMouseMove);
        });
    };

    const handleMouseMove = (event) => {
        setAdditionalPixels((prevPixels) => prevPixels + event.movementY);
    };

    if (listing === null || amm === null || !base_mint || mmLaunchData === null) {
        return <Loader />;
    }

    let latest_rewards = filterLaunchRewards(mmLaunchData, amm);

    return (
        <>
            <Head>
                <title>Let&apos;s Cook | Trade</title>
            </Head>
            <main className="md:p-8">
                <HStack className="gap-2" align="start" pb={sm ? 14 : 0}>
                    {(!sm || (sm && (mobilePageContent === "Info" || mobilePageContent === "Trade"))) && (
                        <VStack
                            align="start"
                            w={sm ? "100%" : 320}
                            className="min-w-[375px] rounded-xl border-t-[3px] border-orange-700 bg-[#161616] bg-opacity-75 bg-clip-padding shadow-2xl backdrop-blur-sm backdrop-filter"
                            gap={0}
                        >
                            <HStack
                                spacing={5}
                                w="100%"
                                px={5}
                                pb={sm ? 5 : 0}
                                style={{ borderBottom: sm ? "0.5px solid rgba(134, 142, 150, 0.5)" : "" }}
                                className="py-4"
                            >
                                <Image
                                    alt="Launch icon"
                                    src={base_mint.icon}
                                    width={65}
                                    height={65}
                                    style={{ borderRadius: "8px", backgroundSize: "cover" }}
                                />
                                <VStack align="start" spacing={1}>
                                    <p className="text-xl text-white">{base_mint.symbol}</p>
                                    <HStack spacing={3} align="start" justify="start">
                                        <p className="text-lg text-white">{trimAddress(base_mint.mint.address.toString())}</p>

                                        <Tooltip label="Copy Contract Address" hasArrow fontSize="large" offset={[0, 10]}>
                                            <div
                                                style={{ cursor: "pointer" }}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    navigator.clipboard.writeText(base_mint.mint.address.toString());
                                                }}
                                            >
                                                <MdOutlineContentCopy color="white" size={25} />
                                            </div>
                                        </Tooltip>

                                        <Tooltip label="View in explorer" hasArrow fontSize="large" offset={[0, 10]}>
                                            <Link
                                                href={getSolscanLink(base_mint.mint.address, "Token")}
                                                target="_blank"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Image src="/images/solscan.png" width={25} height={25} alt="Solscan icon" />
                                            </Link>
                                        </Tooltip>
                                    </HStack>
                                </VStack>
                            </HStack>

                            {!sm && (
                                <div className="w-full px-4 pb-4">
                                    <Button
                                        onClick={() => {
                                            leftPanel === "Info"
                                                ? setLeftPanel("Trade")
                                                : leftPanel === "Trade"
                                                  ? setLeftPanel("Info")
                                                  : setLeftPanel("Info");
                                        }}
                                        className="w-full px-10 py-8 text-2xl transition-all hover:opacity-90"
                                    >
                                        {leftPanel === "Info" ? "Trade" : "Info"}
                                    </Button>
                                </div>
                            )}

                            {leftPanel === "Info" && (
                                <InfoContent
                                    listing={listing}
                                    amm={amm}
                                    base_mint={base_mint}
                                    volume={last_day_volume}
                                    mm_data={latest_rewards}
                                    price={market_data.length > 0 ? market_data[market_data.length - 1].close : 0}
                                    total_supply={total_supply}
                                    sol_price={SOLPrice}
                                    quote_amount={amm_quote_amount}
                                />
                            )}

                            {leftPanel === "Trade" && (
                                <BuyAndSell
                                    amm={amm}
                                    base_mint={base_mint}
                                    base_balance={amm_base_amount}
                                    quote_balance={amm_quote_amount}
                                    amm_lp_balance={amm_lp_amount}
                                    user_base_balance={user_base_amount}
                                    user_lp_balance={user_lp_amount}
                                />
                            )}
                        </VStack>
                    )}

                    {(!sm || (sm && mobilePageContent === "Chart")) && (
                        <VStack
                            align="start"
                            justify="start"
                            w="100%"
                            spacing={1}
                            style={{
                                minHeight: "100vh",
                                overflow: "auto",
                            }}
                        >
                            {/* <div className="w-full overflow-auto rounded-lg bg-[#161616] bg-opacity-75 bg-clip-padding p-3 shadow-2xl backdrop-blur-sm backdrop-filter"> */}
                            <ChartComponent data={market_data} additionalPixels={additionalPixels} />
                            {/* </div> */}
                            <div
                                style={{
                                    width: "100%",
                                    height: "0px",
                                    cursor: "ns-resize",
                                    position: "relative",
                                }}
                                onMouseDown={handleMouseDown}
                            >
                                <PiArrowsOutLineVerticalLight
                                    size={26}
                                    style={{
                                        position: "absolute",
                                        color: "white",
                                        margin: "auto",
                                        top: 0,
                                        left: 0,
                                        bottom: 0,
                                        right: 0,
                                        opacity: 0.75,
                                        zIndex: 99,
                                    }}
                                />
                            </div>

                            <MyRewardsTable amm={amm} />

                            {!wallet.connected && (
                                <HStack w="100%" align="center" justify="center" mt={25}>
                                    <Text fontSize={lg ? "large" : "x-large"} m={0} color={"white"} style={{ opacity: 0.5 }}>
                                        Connect your wallet to see your orders
                                    </Text>
                                </HStack>
                            )}
                        </VStack>
                    )}
                </HStack>

                {sm && (
                    <HStack
                        bg="url(/images/footer_fill.jpeg)"
                        bgSize="cover"
                        boxShadow="0px 3px 13px 13px rgba(0, 0, 0, 0.55)"
                        position="fixed"
                        bottom={0}
                        h={16}
                        w="100%"
                        gap={2}
                        justify="space-around"
                    >
                        <VStack
                            spacing={0.5}
                            w="120px"
                            onClick={() => {
                                setMobilePageContent("Chart");
                            }}
                        >
                            <FaChartLine size={24} color={"#683309"} />
                            <Text mb={0} color={"#683309"} fontSize="medium" fontWeight="bold">
                                Chart
                            </Text>
                        </VStack>

                        <VStack
                            w="120px"
                            onClick={() => {
                                setMobilePageContent("Trade");
                                setLeftPanel("Trade");
                            }}
                        >
                            <IoMdSwap size={28} color={"#683309"} />
                            <Text mb={0} color={"#683309"} fontSize="medium" fontWeight="bold">
                                Buy/Sell
                            </Text>
                        </VStack>

                        <VStack
                            w="120px"
                            onClick={() => {
                                setMobilePageContent("Info");
                                setLeftPanel("Info");
                            }}
                        >
                            <FaInfo size={24} color={"#683309"} />
                            <Text mb={0} color={"#683309"} fontSize="medium" fontWeight="bold">
                                Info
                            </Text>
                        </VStack>
                    </HStack>
                )}
            </main>
        </>
    );
};

const AddRewardModal = ({ amm, isOpen, onClose }: { amm: AMMData; isOpen: boolean; onClose: () => void }) => {
    const { xs, lg } = useResponsive();
    const [quantity, setQuantity] = useState<string>("");
    const { AddTradeRewards } = useAddTradeRewards();

    const handleSubmit = (e) => {
        let value = parseInt(quantity);
        if (isNaN(value)) {
            toast.error("Invalid quantity");
            return;
        }
        if (!amm) {
            toast.error("Waiting for AMM Data");
            return;
        }
        AddTradeRewards(amm.base_mint.toString(), amm.quote_mint.toString(), value);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} isCentered>
                <ModalOverlay />
                <ModalContent
                    bg="url(/images/square-frame.png)"
                    bgSize="contain"
                    bgRepeat="no-repeat"
                    h={345}
                    py={xs ? 6 : 12}
                    px={xs ? 8 : 10}
                >
                    <ModalBody>
                        <VStack align="start" justify={"center"} h="100%" spacing={0} mt={xs ? -8 : 0}>
                            <Text className="font-face-kg" color="white" fontSize="x-large">
                                Total Rewards
                            </Text>
                            <Input
                                placeholder={"Enter Total Reward Quantity"}
                                size={lg ? "md" : "lg"}
                                maxLength={25}
                                required
                                type="text"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                color="white"
                            />
                            <HStack mt={xs ? 6 : 10} justify="end" align="end" w="100%">
                                <Text
                                    mr={3}
                                    align="end"
                                    fontSize={"medium"}
                                    style={{
                                        fontFamily: "KGSummerSunshineBlackout",
                                        color: "#fc3838",
                                        cursor: "pointer",
                                    }}
                                    onClick={onClose}
                                >
                                    GO BACK
                                </Text>
                                <button
                                    type="button"
                                    onClick={async (e) => {
                                        handleSubmit(e);
                                    }}
                                    className={`${styles.nextBtn} font-face-kg`}
                                >
                                    Add
                                </button>
                            </HStack>
                        </VStack>
                    </ModalBody>
                </ModalContent>
            </Modal>
        </>
    );
};

const BuyAndSell = ({
    amm,
    base_mint,
    base_balance,
    quote_balance,
    amm_lp_balance,
    user_base_balance,
    user_lp_balance,
}: {
    amm: AMMData;
    base_mint: MintData;
    base_balance: number;
    quote_balance: number;
    amm_lp_balance: number;
    user_base_balance: number;
    user_lp_balance: number;
}) => {
    const { xs } = useResponsive();
    const wallet = useWallet();
    const { handleConnectWallet } = UseWalletConnection();
    const [selected, setSelected] = useState("Buy");
    const [token_amount, setTokenAmount] = useState<number>(0);
    const [sol_amount, setSOLAmount] = useState<number>(0);

    const { userSOLBalance } = useAppRoot();

    const handleClick = (tab: string) => {
        setSelected(tab);
    };

    //console.log(base_balance/Math.pow(10, 6), quote_balance)

    let transfer_fee = 0;
    let max_transfer_fee = 0;
    let transfer_fee_config = getTransferFeeConfig(base_mint.mint);
    if (transfer_fee_config !== null) {
        transfer_fee = transfer_fee_config.newerTransferFee.transferFeeBasisPoints;
        max_transfer_fee = Number(transfer_fee_config.newerTransferFee.maximumFee) / Math.pow(10, base_mint.mint.decimals);
    }

    return (
        <VStack align="start" w="100%" gap={0}>
            <HStack align="center" spacing={0} zIndex={99} w="100%" className="px-4">
                {["Buy", "Sell", "LP+", "LP-"].map((name, i) => {
                    const isActive = selected === name;

                    const baseStyle = {
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                    };

                    const activeStyle = {
                        background: isActive ? "#edf2f7" : "transparent",
                        color: isActive ? "black" : "white",
                        borderRadius: isActive ? "6px" : "",
                        border: isActive ? "none" : "",
                    };

                    return (
                        <Box
                            key={i}
                            style={{
                                ...baseStyle,
                                ...activeStyle,
                            }}
                            onClick={() => {
                                handleClick(name);
                            }}
                            px={4}
                            py={2}
                            w={"50%"}
                        >
                            <Text m={"0 auto"} fontSize="large" fontWeight="semibold">
                                {name}
                            </Text>
                        </Box>
                    );
                })}
            </HStack>
            <div className="mt-1 flex w-full justify-between px-4 py-3">
                <span className="text-md text-white text-opacity-50">Available Balance:</span>
                <span className="text-md text-white/50">
                    {selected === "Buy"
                        ? userSOLBalance.toFixed(5)
                        : selected === "LP-"
                          ? user_lp_balance / Math.pow(10, 9) < 1e-3
                              ? (user_lp_balance / Math.pow(10, 9)).toExponential(3)
                              : (user_lp_balance / Math.pow(10, 9)).toFixed(Math.min(3))
                          : (user_base_balance / Math.pow(10, base_mint.mint.decimals)).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                            })}{" "}
                    {selected === "Buy" ? Config.token : selected === "LP-" ? "LP" : base_mint.symbol}
                </span>
            </div>
            {/* 

            <div className="flex w-full justify-between border-b border-gray-600/50 px-4 py-3">
                <span className="text-md text- text-white text-opacity-50">AMM LP Fee:</span>
                <span className="text-md text-white">{(amm.fee * 0.01).toFixed(2)}%</span>
            </div>

            <div className="flex w-full justify-between border-b border-gray-600/50 px-4 py-3">
                <span className="text-md text- text-white text-opacity-50">Transfer Fee (bps):</span>
                <span className="text-md text-white">{transfer_fee}</span>
            </div>

            <div className="flex w-full justify-between border-b border-gray-600/50 px-4 py-3">
                <span className="text-md text- text-white text-opacity-50">Max Transfer Fee ({base_mint.symbol}):</span>
                <span className="text-md text-white">{max_transfer_fee}</span>
            </div> */}

            {selected === "Buy" && (
                <BuyPanel
                    amm={amm}
                    base_mint={base_mint}
                    user_base_balance={user_base_balance}
                    user_quote_balance={userSOLBalance}
                    sol_amount={sol_amount}
                    token_amount={token_amount}
                    connected={wallet.connected}
                    setSOLAmount={setSOLAmount}
                    setTokenAmount={setTokenAmount}
                    handleConnectWallet={handleConnectWallet}
                    amm_base_balance={base_balance}
                    amm_quote_balance={quote_balance}
                />
            )}
            {selected === "Sell" && (
                <SellPanel
                    amm={amm}
                    base_mint={base_mint}
                    user_base_balance={user_base_balance}
                    user_quote_balance={userSOLBalance}
                    sol_amount={sol_amount}
                    token_amount={token_amount}
                    connected={wallet.connected}
                    setSOLAmount={setSOLAmount}
                    setTokenAmount={setTokenAmount}
                    handleConnectWallet={handleConnectWallet}
                    amm_base_balance={base_balance}
                    amm_quote_balance={quote_balance}
                />
            )}
            {selected === "LP+" && (
                <AddLiquidityPanel
                    amm={amm}
                    base_mint={base_mint}
                    user_base_balance={user_base_balance}
                    user_quote_balance={userSOLBalance}
                    sol_amount={sol_amount}
                    token_amount={token_amount}
                    connected={wallet.connected}
                    setSOLAmount={setSOLAmount}
                    setTokenAmount={setTokenAmount}
                    handleConnectWallet={handleConnectWallet}
                    amm_base_balance={base_balance}
                    amm_quote_balance={quote_balance}
                    amm_lp_balance={amm_lp_balance}
                />
            )}
            {selected === "LP-" && (
                <RemoveLiquidityPanel
                    amm={amm}
                    base_mint={base_mint}
                    user_base_balance={user_base_balance}
                    user_quote_balance={userSOLBalance}
                    user_lp_balance={user_lp_balance}
                    sol_amount={sol_amount}
                    token_amount={token_amount}
                    connected={wallet.connected}
                    setSOLAmount={setSOLAmount}
                    setTokenAmount={setTokenAmount}
                    handleConnectWallet={handleConnectWallet}
                    amm_base_balance={base_balance}
                    amm_quote_balance={quote_balance}
                    amm_lp_balance={amm_lp_balance}
                />
            )}
        </VStack>
    );
};

const InfoContent = ({
    listing,
    amm,
    base_mint,
    price,
    sol_price,
    quote_amount,
    volume,
    total_supply,
    mm_data,
}: {
    listing: ListingData;
    amm: AMMData;
    base_mint: MintData;
    price: number;
    sol_price: number;
    quote_amount: number;
    volume: number;
    total_supply: number;
    mm_data: MMLaunchData | null;
}) => {
    const { isOpen: isRewardsOpen, onOpen: onRewardsOpen, onClose: onRewardsClose } = useDisclosure();

    let current_date = Math.floor((new Date().getTime() / 1000 - bignum_to_num(amm.start_time)) / 24 / 60 / 60);
    let reward = reward_schedule(current_date, amm, base_mint);
    if (mm_data !== null && mm_data !== undefined) {
        reward = bignum_to_num(mm_data.token_rewards) / Math.pow(10, base_mint.mint.decimals);
    }

    let market_cap = total_supply * price * sol_price;
    let liquidity = Math.min(market_cap, 2 * (quote_amount / Math.pow(10, 9)) * sol_price);

    let market_cap_string =
        sol_price === 0
            ? "--"
            : market_cap.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
              });

    let liquidity_string =
        sol_price === 0
            ? "--"
            : liquidity.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
              });

    return (
        <>
            <div className="-mt-2 flex w-full flex-col space-y-0">
                <div className="flex w-full justify-between border-b border-gray-600/50 px-4 py-3">
                    <span className="text-md text- text-white text-opacity-50">Pool:</span>
                    <div className="flex items-center space-x-2">
                        <span className="text-md text-white">{amm.provider === 0 ? "Let's Cook" : "Raydium"}</span>
                        {amm.provider === 0 && <Image src="/favicon.ico" alt="Cook Icon" width={30} height={30} />}
                        {amm.provider === 1 && <Image src="/images/raydium.png" alt="Raydium Icon" width={30} height={30} />}
                    </div>
                </div>

                <div className="flex w-full justify-between border-b border-gray-600/50 px-4 py-3">
                    <span className="text-md text- text-white text-opacity-50">Price:</span>
                    <div className="flex items-center space-x-2">
                        <span className="text-md text-white">{formatPrice(price, 5)}</span>
                        <Image src={Config.token_image} width={30} height={30} alt="SOL Icon" />
                    </div>
                </div>

                <div className="flex w-full justify-between border-b border-gray-600/50 px-4 py-3">
                    <span className="text-md text- text-white text-opacity-50">Volume (24h):</span>
                    <div className="flex items-center space-x-2">
                        <span className="text-md text-white">{(volume * price).toLocaleString()}</span>
                        <Image src={Config.token_image} width={30} height={30} alt="Token Icon" />
                    </div>
                </div>

                <div className="flex w-full justify-between border-b border-gray-600/50 px-4 py-3">
                    <span className="text-md text- text-white text-opacity-50">Market Making Volume:</span>
                    <span className="text-md text-white">
                        {mm_data ? (bignum_to_num(mm_data.buy_amount) / Math.pow(10, base_mint.mint.decimals)).toLocaleString() : 0}
                    </span>
                </div>

                <div className="flex w-full justify-between border-b border-gray-600/50 px-4 py-3">
                    <div className="flex items-center space-x-2">
                        <span className="text-md text- text-white text-opacity-50">Market Making Rewards:</span>
                        {reward === 0 && (
                            <span className="text-md text- text-white text-opacity-50">
                                <FaPlusCircle onClick={() => onRewardsOpen()} />
                            </span>
                        )}
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-md text-white">{reward.toLocaleString()}</span>
                        <Image src={base_mint.icon} width={30} height={30} alt="Token Icon" />
                    </div>
                </div>

                <div className="flex w-full justify-between border-b border-gray-600/50 px-4 py-3">
                    <span className="text-md text- text-white text-opacity-50">Token Supply:</span>
                    <span className="text-md text-white">{total_supply.toLocaleString()}</span>
                </div>
                {/*<div className="flex w-full justify-between border-b border-gray-600/50 px-4 py-3">
                    <span className="text-md text- text-white text-opacity-50">Market Cap:</span>
                    <span className="text-md text-white">${market_cap_string}</span>
                </div>*/}

                <div className="flex w-full justify-between border-b border-gray-600/50 px-4 py-3">
                    <span className="text-md text- text-white text-opacity-50">Liquidity:</span>
                    <span className="text-md text-white">${liquidity_string}</span>
                </div>

                <div className="flex w-full justify-between border-b border-gray-600/50 px-4 py-3">
                    <span className="text-md text- text-white text-opacity-50">Hype:</span>
                    <HypeVote
                        launch_type={0}
                        launch_id={listing.id}
                        page_name={""}
                        positive_votes={listing.positive_votes}
                        negative_votes={listing.negative_votes}
                        isTradePage={true}
                        listing={listing}
                    />
                </div>

                {/* Socials */}
                <div className="flex w-full justify-between px-4 py-3">
                    <span className="text-md text- text-white text-opacity-50">Socials:</span>
                    <Links socials={listing.socials} isTradePage={true} />
                </div>

                {/* Extensions */}
                {base_mint.extensions !== 0 && (
                    <div className="flex w-full justify-between border-b border-gray-600/50 px-4 py-3">
                        <span className="text-md text- text-white text-opacity-50">Extensions:</span>
                        <ShowExtensions extension_flag={base_mint.extensions} />
                    </div>
                )}
            </div>
            <AddRewardModal amm={amm} isOpen={isRewardsOpen} onClose={onRewardsClose} />
        </>
    );
};

const ChartComponent = (props) => {
    const { data, additionalPixels } = props;

    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);

    useEffect(() => {
        const handleResize = () => {
            if (chartRef.current) {
                chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        if (chartContainerRef.current) {
            const chart = createChart(chartContainerRef.current, {
                layout: {
                    background: { color: "#171B26" },
                    textColor: "#DDD",
                },
                grid: {
                    vertLines: { color: "#242733" },
                    horzLines: { color: "#242733" },
                },
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                },
                crosshair: {
                    mode: CrosshairMode.Normal,
                },
                width: chartContainerRef.current.clientWidth,
                height: chartContainerRef.current.clientHeight,
            });

            chartRef.current = chart;

            const series = chart.addCandlestickSeries({
                upColor: "#00C38C",
                downColor: "#F94D5C",
                borderVisible: false,
                wickUpColor: "#00C38C",
                wickDownColor: "#F94D5C",
                priceFormat: {
                    type: "custom",
                    formatter: (price) => price.toExponential(2),
                    minMove: 0.000000001,
                },
            });

            seriesRef.current = series;
            series.setData(data);

            chart.timeScale().fitContent();

            window.addEventListener("resize", handleResize);

            return () => {
                window.removeEventListener("resize", handleResize);
                chart.remove();
            };
        }
    }, [data]);

    useEffect(() => {
        if (seriesRef.current) {
            seriesRef.current.setData(data);
        }
    }, [data]);

    useEffect(() => {
        if (chartContainerRef.current && chartRef.current) {
            const newHeight = `calc(60vh + ${additionalPixels}px)`;
            chartContainerRef.current.style.height = newHeight;
            chartRef.current.applyOptions({
                height: chartContainerRef.current.clientHeight,
            });
        }
    }, [additionalPixels]);

    return (
        <HStack
            ref={chartContainerRef}
            className="rounded-xl"
            justify="center"
            id="chartContainer"
            w="100%"
            h={`calc(60vh + ${additionalPixels}px)`}
            style={{
                overflow: "auto",
                position: "relative",
            }}
            spacing={0}
        />
    );
};

export default TradePage;
