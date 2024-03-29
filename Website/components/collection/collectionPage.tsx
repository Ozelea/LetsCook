import { Dispatch, SetStateAction, MutableRefObject, useState, useEffect } from "react";
import styles from "../../styles/LaunchDetails.module.css";

import { Center, VStack, Text, Input, HStack, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { PublicKey } from "@solana/web3.js";

import { DEFAULT_FONT_SIZE, PROGRAM } from "../Solana/constants";
import { LaunchData, LaunchDataUserInput, request_current_balance } from "../Solana/state";
import useResponsive from "../../hooks/useResponsive";
import { useRouter } from "next/router";
import useAppRoot from "../../context/useAppRoot";
import { toast } from "react-toastify";
import { RxSlash } from "react-icons/rx";
import Image from "next/image";

interface CollectionPageProps {
    setScreen: Dispatch<SetStateAction<string>>;
}

const CollectionPage = ({ setScreen }: CollectionPageProps) => {
    const router = useRouter();
    const { sm, md, lg } = useResponsive();
    const { newLaunchData } = useAppRoot();
    const [name, setName] = useState<string>(newLaunchData.current.pagename);
    const [description, setDescription] = useState<string>(newLaunchData.current.description);
    const [web, setWeb] = useState<string>(newLaunchData.current.web_url);
    const [telegram, setTelegram] = useState<string>(newLaunchData.current.tele_url);
    const [twitter, setTwitter] = useState(newLaunchData.current.twt_url);
    const [discord, setDiscord] = useState(newLaunchData.current.disc_url);
    const [banner_name, setBannerName] = useState<string>("");

    const handleNameChange = (e) => {
        setName(e.target.value);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];

        if (file) {
            if (file.size <= 4194304) {
                newLaunchData.current.banner_file = file;
                setBannerName(file.name);
            } else {
                alert("File size exceeds 4MB limit.");
            }
        }
    };

    function containsNone(str: string, set: string[]) {
        return str.split("").every(function (ch) {
            return set.indexOf(ch) === -1;
        });
    }

    async function setData(e): Promise<boolean> {
        e.preventDefault();

        let invalid_chars = [
            ":",
            "/",
            "?",
            "#",
            "[",
            "]",
            "@",
            "&",
            "=",
            "+",
            "$",
            ",",
            "{",
            "}",
            "|",
            "\\",
            "^",
            "~",
            "`",
            "<",
            ">",
            "%",
            " ",
            '"',
        ];
        console.log("invalid chars:", invalid_chars);

        if (!containsNone(name, invalid_chars)) {
            toast.error("Page name contains invalid characters for URL");
            return false;
        }

        if (description.length > 250) {
            toast.error("Description should be less than 250 characters long");
            return false;
        }

        return true;
    }

    async function submit(e) {
        if (await setData(e)) {
            alert("Created Successfully");
        }
    }

    return (
        <Center style={{ background: "linear-gradient(180deg, #292929 0%, #0B0B0B 100%)" }} width="100%">
            <VStack w="100%" style={{ paddingBottom: md ? 35 : "75px" }}>
                <Text mb={8} align="start" className="font-face-kg" color={"white"} fontSize="x-large">
                    Page Information:
                </Text>
                <form style={{ width: lg ? "100%" : "1200px" }}>
                    <VStack px={lg ? 4 : 12}>
                        <div className={styles.launchBodyUpper}>
                            <div className={styles.launchBodyUpperFields}>
                                <HStack spacing={0} className={styles.eachField}>
                                    <div className={`${styles.textLabel} font-face-kg`} style={{ minWidth: lg ? "110px" : "147px" }}>
                                        Page Name:
                                    </div>

                                    <InputGroup style={{ width: lg ? "100%" : "50%", position: "relative" }}>
                                        <InputLeftElement color="white">
                                            <RxSlash size={22} style={{ opacity: 0.5, marginTop: lg ? 0 : 8 }} />
                                        </InputLeftElement>

                                        <Input
                                            pl={8}
                                            bg="#494949"
                                            size={lg ? "md" : "lg"}
                                            required
                                            placeholder="Yourpagename"
                                            className={styles.inputBox}
                                            type="text"
                                            value={name}
                                            onChange={handleNameChange}
                                        />
                                    </InputGroup>
                                </HStack>

                                <HStack spacing={0} mt={sm ? 0 : 3} className={styles.eachField}>
                                    <div className={`${styles.textLabel} font-face-kg`} style={{ minWidth: lg ? "110px" : "175px" }}>
                                        Banner:
                                    </div>

                                    <div>
                                        <label className={styles.label}>
                                            <input id="file" type="file" onChange={handleFileChange} />
                                            <span
                                                className={styles.browse}
                                                style={{
                                                    cursor: newLaunchData.current.edit_mode === true ? "not-allowed" : "pointer",
                                                    padding: "5px 10px",
                                                }}
                                            >
                                                BROWSE
                                            </span>
                                        </label>
                                    </div>

                                    <Text m={0} ml={5} color="white" className="font-face-rk" fontSize={lg ? "medium" : "lg"}>
                                        {newLaunchData.current.banner_file !== null ? banner_name : "No File Selected"}
                                    </Text>
                                </HStack>
                            </div>
                        </div>

                        <VStack w="100%" spacing={30} mt={42} mb={25}>
                            <div className={styles.launchBodyLowerVertical}>
                                <div className={`${styles.textLabel} font-face-kg`} style={{ minWidth: "175px" }}>
                                    DESCRIPTION:
                                </div>
                                <div>
                                    <textarea
                                        maxLength={250}
                                        required
                                        placeholder="Feel free to provide more details about your token, it will be displayed in your token page."
                                        style={{ minHeight: 200 }}
                                        className={`${styles.inputBox} ${styles.inputTxtarea}`}
                                        value={description}
                                        onChange={(e) => {
                                            setDescription(e.target.value);
                                        }}
                                    />
                                </div>
                            </div>

                            <div className={styles.launchBodyLowerHorizontal}>
                                <div className={styles.eachField}>
                                    <Image width={40} height={40} src="/images/web.png" alt="Website Logo" />
                                    <div className={styles.textLabelInput}>
                                        <input
                                            placeholder="Enter your Website URL"
                                            className={styles.inputBox}
                                            type="text"
                                            value={web}
                                            onChange={(e) => {
                                                setWeb(e.target.value);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.launchBodyLowerHorizontal}>
                                <div className={styles.eachField}>
                                    <Image width={40} height={40} src="/images/tele.png" alt="Telegram" />

                                    <div className={styles.textLabelInput}>
                                        <input
                                            className={styles.inputBox}
                                            placeholder="Enter your Telegram Invite URL"
                                            type="text"
                                            value={telegram}
                                            onChange={(e) => {
                                                setTelegram(e.target.value);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className={styles.launchBodyLowerHorizontal}>
                                <div className={styles.eachField}>
                                    <Image width={40} height={40} src="/images/twt.png" alt="Twitter" />

                                    <div className={styles.textLabelInput}>
                                        <input
                                            required
                                            className={styles.inputBox}
                                            placeholder="Enter your Twitter URL"
                                            type="text"
                                            value={twitter}
                                            onChange={(e) => {
                                                setTwitter(e.target.value);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className={styles.launchBodyLowerHorizontal}>
                                <div className={styles.eachField}>
                                    <Image width={40} height={40} src="/images/discord.png" alt="Discord" />

                                    <div className={styles.textLabelInput}>
                                        <input
                                            className={styles.inputBox}
                                            placeholder="Enter your Discord Invite URL"
                                            type="text"
                                            value={discord}
                                            onChange={(e) => {
                                                setDiscord(e.target.value);
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </VStack>

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                gap: 20,
                                marginTop: -1,
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setScreen("step 3");
                                }}
                                className={`${styles.nextBtn} font-face-kg `}
                            >
                                Go Back
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    submit(e);
                                }}
                                className={`${styles.nextBtn} font-face-kg `}
                            >
                                Confirm (4/4)
                            </button>
                        </div>
                    </VStack>
                </form>
            </VStack>
        </Center>
    );
};

export default CollectionPage;
