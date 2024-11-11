import { VStack, Text, Grid, GridItem, Box, Spinner, Flex, useDisclosure } from "@chakra-ui/react";
import { Modal, ModalOverlay, ModalContent, ModalBody } from "@chakra-ui/react";
import useResponsive from "../../hooks/useResponsive";
import Image from "next/image";
import { CSSProperties, useState } from "react";
import { AssetV1, Attribute } from "@metaplex-foundation/mpl-core";
import useWrapNFT from "../../hooks/collections/useWrapNFT";
import { CollectionData, NFTListingData } from "./collectionState";
import { PublicKey } from "@solana/web3.js";
import { AssetWithMetadata } from "../../pages/collection/[pageName]";
import { Button } from "../ui/button";
import { FaEye } from "react-icons/fa";
import useListNFT from "@/hooks/collections/useListNFT";
import ViewNFTDetails from "./viewNftDetails";
import { useWallet } from "@solana/wallet-adapter-react";
import useUnlistNFT from "@/hooks/collections/useUnlistNFT";
import useBuyNFT from "@/hooks/collections/useBuyNFT";
import { Config } from "../Solana/constants";
import { lamportsToSol } from "@/utils/lamportToSol";

interface MarketplaceProps {
    ownedNFTs?: AssetWithMetadata[];
    listedNFTs: AssetWithMetadata[];
    allListings?: NFTListingData[];
    collection: CollectionData;
    tab?: string;
}

function Marketplace({ ownedNFTs, listedNFTs, allListings, collection, tab }: MarketplaceProps) {
    const wallet = useWallet();
    const [selectedNFT, setSelectedNFT] = useState<AssetWithMetadata | null>(null);
    const [isNFTListed, setIsNFTListed] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState(null);
    const [isUserOwned, setIsUserowned] = useState(false);
    const [nftIndex, setNftIndex] = useState(0);

    const handleMouseEnter = (index) => setHoveredIndex(index);
    const handleMouseLeave = () => setHoveredIndex(null);

    const { UnlistNFT } = useUnlistNFT(collection);
    const { BuyNFT } = useBuyNFT(collection);

    const { isOpen: isViewDetailsOpened, onOpen: openViewDetailsModal, onClose: closeViewDetailsModal } = useDisclosure();

    const handleNFTClick = (nft: AssetWithMetadata, isUserOwned: boolean, index: number) => {
        setNftIndex(index);
        setIsUserowned(isUserOwned);
        setSelectedNFT(nft);
        openViewDetailsModal();
    };

    // Extract public keys of NFTs listed by the owner
    const ownerListedNFTPubkeys = wallet.connected
        ? allListings?.filter((listing) => listing?.seller.equals(wallet.publicKey)).map((listing) => listing.asset) || []
        : [];

    // Filter `listedNFTs` to include only those listed by the owner
    const ownerListedNFTs = wallet.connected
        ? listedNFTs.filter((nft) => ownerListedNFTPubkeys.some((pubkey) => pubkey.equals(new PublicKey(nft.asset.publicKey))))
        : [];

    return (
        <>
            <main>
                <VStack h="100%" position="relative" overflowY="auto">
                    {listedNFTs.length > 0 ? (
                        <Flex w={"100%"} wrap={"wrap"} gap={10} justify={"center"} align={"center"}>
                            {listedNFTs.map((nft, index) => {
                                const isUserOwned = ownerListedNFTs.some((ownedNFT) => ownedNFT.asset.publicKey === nft.asset.publicKey);

                                const listingData = allListings?.find((listing) => {
                                    const assetKey = new PublicKey(nft.asset.publicKey);
                                    const listingKey = listing.asset;

                                    return assetKey.equals(listingKey);
                                });

                                const price = listingData ? listingData.price.toString() : "Unavailable";

                                const nftIndex = listedNFTs.indexOf(nft);

                                return (
                                    <GridItem key={`nft-${index}`}>
                                        <VStack>
                                            <Box
                                                style={gridItemStyle}
                                                onMouseEnter={() => handleMouseEnter(index)}
                                                onMouseLeave={handleMouseLeave}
                                            >
                                                <Image
                                                    src={nft.metadata["image"]}
                                                    width={180}
                                                    height={180}
                                                    style={{ borderRadius: "8px" }}
                                                    alt="nftImage"
                                                />
                                                <VStack
                                                    style={{
                                                        ...overlayVisibleStyle,
                                                        display: hoveredIndex === index ? "flex" : "none",
                                                    }}
                                                    onClick={() => {
                                                        handleNFTClick(nft, isUserOwned, nftIndex);
                                                    }}
                                                >
                                                    <Text
                                                        m={0}
                                                        lineHeight={0.75}
                                                        align="center"
                                                        fontSize="large"
                                                        style={{
                                                            fontFamily: "pokemon",
                                                            color: "white",
                                                            fontWeight: "semibold",
                                                        }}
                                                    >
                                                        {nft.asset.name}
                                                    </Text>
                                                    <FaEye />
                                                </VStack>
                                            </Box>
                                            <p className="text-white">
                                                {lamportsToSol(price)} {Config.token}
                                            </p>
                                            <Button
                                                className="mt-2 transition-all hover:opacity-90"
                                                size="lg"
                                                onClick={async () => {
                                                    if (isUserOwned) {
                                                        await UnlistNFT(new PublicKey(nft.asset.publicKey), nftIndex);
                                                    } else {
                                                        await BuyNFT(new PublicKey(nft.asset.publicKey), nftIndex);
                                                    }
                                                }}
                                            >
                                                {isUserOwned ? "Unlist" : "Buy"}
                                            </Button>
                                        </VStack>
                                    </GridItem>
                                );
                            })}
                        </Flex>
                    ) : (
                        <div className="my-4 flex flex-col gap-2">
                            <Text className="text-center text-xl font-semibold text-white opacity-25">
                                You Don&apos;t Have Any {collection.nft_name}
                            </Text>
                        </div>
                    )}
                </VStack>
            </main>

            {selectedNFT && (
                <ViewNFTDetails
                    isOpened={isViewDetailsOpened}
                    onClose={() => {
                        closeViewDetailsModal();
                        setSelectedNFT(null);
                        setIsNFTListed(null);
                        setIsUserowned(false);
                    }}
                    collection={collection}
                    nft={selectedNFT}
                    isNFTListed={isUserOwned}
                    isUserOwned={isUserOwned}
                    tab={tab}
                    nftIndex={nftIndex}
                />
            )}
        </>
    );
}

const Attributes = ({ asset }: { asset: AssetWithMetadata }) => {
    // let attributes = asset.asset.attributes.attributeList;
    let asset_name = asset.metadata["name"] ? asset.metadata["name"] : asset.asset.name;
    let asset_Attribute = asset.metadata["attributes"] ? asset.metadata["attributes"] : null;
    return (
        <>
            <div className="flex w-full items-start justify-center gap-4 text-white">
                <Image src={asset.metadata["image"]} width={280} height={280} style={{ borderRadius: "8px" }} alt="nftImage" />
                <div className="flex flex-col gap-3">
                    <span>Asset name: {asset_name}</span>
                    {asset_Attribute !== null &&
                        asset_Attribute.map((value, index) => (
                            <span key={index}>
                                {value.trait_type}: {value["value"]}
                            </span>
                        ))}
                </div>
            </div>
        </>
    );
};

const gridItemStyle: CSSProperties = {
    position: "relative",
    backgroundColor: "lightgray",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: "bold",
    borderRadius: "8px",
    cursor: "pointer",
};

const overlayStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "8px",
    opacity: 0,
    transition: "opacity 0.3s ease",
};

const overlayVisibleStyle = {
    ...overlayStyle,
    opacity: 1,
};
export default Marketplace;
