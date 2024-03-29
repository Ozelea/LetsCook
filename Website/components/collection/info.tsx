import { Dispatch, SetStateAction, useState } from "react";
import { Center, VStack, Text, HStack, Input, chakra, Flex } from "@chakra-ui/react";
import { useRouter } from "next/router";
import Image from "next/image";
import styles from "../../styles/Launch.module.css";
import useResponsive from "../../hooks/useResponsive";
import styles2 from "../../styles/LaunchDetails.module.css";
import getImageDimensions from "../../utils/getImageDimension";
import { toast } from "react-toastify";

interface CollectionInfoProps {
    setScreen: Dispatch<SetStateAction<string>>;
}

const CollectionInfo = ({ setScreen }: CollectionInfoProps) => {
    const router = useRouter();
    const { sm, md, lg } = useResponsive();

    const [name, setName] = useState<string>("");
    const [symbol, setSymbol] = useState<string>("");
    const [maxSupply, setMaxSupply] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [displayImg, setDisplayImg] = useState<string>("");

    const handleNameChange = (e) => {
        setName(e.target.value);
    };
    const handleSymbolChange = (e) => {
        setSymbol(e.target.value);
    };
    const handleMaxSupplyChange = (e) => {
        setMaxSupply(e.target.value);
    };
    const handleDescriptionChange = (e) => {
        setDescription(e.target.value);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files && e.target.files[0];

        if (file) {
            if (file.size <= 1048576) {
                const dimensions = await getImageDimensions(file);

                if (dimensions.width === dimensions.height) {
                    // newLaunchData.current.icon_file = file;
                    setDisplayImg(URL.createObjectURL(e.target.files[0]));
                } else {
                    toast.error("Please upload an image with equal width and height.");
                }
            } else {
                toast.error("File size exceeds 1MB limit.");
            }
        }
    };

    const Browse = () => (
        <HStack spacing={0} className={styles.eachField}>
            <div className={`${styles.textLabel} font-face-kg`} style={{ minWidth: lg ? "100px" : "132px" }}>
                Image:
            </div>
            <div>
                <label className={styles.label}>
                    <input id="file" type="file" onChange={(e) => handleFileChange(e)} />
                    <span className={styles.browse} style={{ cursor: "pointer", padding: "5px 10px" }}>
                        BROWSE
                    </span>
                </label>
            </div>
            <Text m={0} ml={5} className="font-face-rk" fontSize={lg ? "medium" : "lg"}>
                {displayImg ? "File Selected" : "No File Selected"}
            </Text>
        </HStack>
    );

    function setLaunchData(e) {
        e.preventDefault();

        // Todo: Validation

        setScreen("step 2");
    }

    return (
        <Center style={{ background: "linear-gradient(180deg, #292929 0%, #0B0B0B 100%)" }} width="100%">
            <VStack w="100%" style={{ paddingBottom: md ? 35 : "75px" }}>
                <Text align="start" className="font-face-kg" color={"white"} fontSize="x-large">
                    Collection Info:
                </Text>
                <form onSubmit={setLaunchData} style={{ width: lg ? "100%" : "1200px" }}>
                    <VStack px={lg ? 4 : 12} spacing={25}>
                        <HStack w="100%" spacing={lg ? 10 : 12} style={{ flexDirection: lg ? "column" : "row" }}>
                            {displayImg ? (
                                <Image
                                    src={displayImg}
                                    width={lg ? 180 : 235}
                                    height={lg ? 180 : 235}
                                    alt="Image Frame"
                                    style={{ backgroundSize: "cover", borderRadius: 12 }}
                                />
                            ) : (
                                <VStack
                                    justify="center"
                                    align="center"
                                    style={{ minWidth: lg ? 180 : 235, minHeight: lg ? 180 : 235, cursor: "pointer" }}
                                    borderRadius={12}
                                    border="2px dashed rgba(134, 142, 150, 0.5)"
                                    as={chakra.label}
                                    htmlFor="file"
                                >
                                    <Text mb={0} fontSize="x-large" color="white" opacity={0.25}>
                                        Image Preview
                                    </Text>

                                    <chakra.input
                                        style={{ display: "none" }}
                                        type="file"
                                        id="file"
                                        name="file"
                                        onChange={(e) => handleFileChange(e)}
                                    />
                                </VStack>
                            )}

                            <VStack spacing={8} flexGrow={1} align="start" width="100%">
                                {lg && <Browse />}

                                <HStack spacing={0} className={styles.eachField}>
                                    <div className={`${styles.textLabel} font-face-kg`} style={{ minWidth: lg ? "100px" : "132px" }}>
                                        Name:
                                    </div>

                                    <div className={styles.textLabelInput}>
                                        <Input
                                            placeholder="Enter Collection Name"
                                            size={lg ? "md" : "lg"}
                                            maxLength={25}
                                            required
                                            className={styles.inputBox}
                                            type="text"
                                            value={name}
                                            onChange={(e) => handleNameChange(e)}
                                        />
                                    </div>
                                </HStack>

                                <Flex gap={sm ? 8 : 5} w="100%" flexDirection={sm ? "column" : "row"}>
                                    <HStack w={sm ? "100%" : "50%"} spacing={0} className={styles.eachField}>
                                        <div className={`${styles.textLabel} font-face-kg`} style={{ minWidth: lg ? "100px" : "132px" }}>
                                            Symbol:
                                        </div>

                                        <div className={styles.textLabelInput}>
                                            <Input
                                                bg="#494949"
                                                placeholder="Enter Collection Symbol"
                                                size={lg ? "md" : "lg"}
                                                maxLength={8}
                                                required
                                                className={styles.inputBox}
                                                type="text"
                                                value={symbol}
                                                onChange={(e) => handleSymbolChange(e)}
                                            />
                                        </div>
                                    </HStack>

                                    <HStack w={sm ? "100%" : "50%"} spacing={sm ? 0 : 3} className={styles.eachField}>
                                        <div className={`${styles.textLabel} font-face-kg`} style={{ minWidth: lg ? "100px" : "140px" }}>
                                            Max Supply:
                                        </div>

                                        <div className={styles.textLabelInput}>
                                            <Input
                                                bg="#494949"
                                                placeholder="Enter Collection Max Supply"
                                                size={lg ? "md" : "lg"}
                                                maxLength={8}
                                                required
                                                className={styles.inputBox}
                                                type="text"
                                                value={maxSupply}
                                                onChange={(e) => handleMaxSupplyChange(e)}
                                            />
                                        </div>
                                    </HStack>
                                </Flex>

                                {!lg && <Browse />}
                            </VStack>
                        </HStack>

                        <div className={styles2.launchBodyLowerVertical}>
                            <div className={`${styles.textLabel} font-face-kg`} style={{ minWidth: "175px", color: "white" }}>
                                DESCRIPTION:
                            </div>
                            <div>
                                <textarea
                                    maxLength={250}
                                    required
                                    placeholder="Feel free to provide more details about your NFT collection, it will be displayed in your collection page."
                                    style={{ minHeight: 200 }}
                                    className={`${styles.inputBox} ${styles2.inputTxtarea}`}
                                    value={description}
                                    onChange={(e) => handleDescriptionChange(e)}
                                />
                            </div>
                        </div>

                        <HStack mt={md ? 0 : 30}>
                            <button type="button" className={`${styles.nextBtn} font-face-kg `} onClick={() => router.push("/dashboard")}>
                                Cancel
                            </button>
                            <button type="submit" className={`${styles.nextBtn} font-face-kg `}>
                                NEXT (1/4)
                            </button>
                        </HStack>
                    </VStack>
                </form>
            </VStack>
        </Center>
    );
};

export default CollectionInfo;
