import { LaunchDataUserInput, defaultUserInput } from "../../components/Solana/state";
import { useRef, useState } from "react";
import TokenPage from "../../components/launch/token";
import DetailsPage from "../../components/launch/details";
import BookPage from "../../components/launch/book";
import Image from "next/image";
import styles from "../../styles/Launch.module.css";
import Link from "next/link";

const Launch = () => {
    const [screen, setScreen] = useState("token");
    const newLaunchData = useRef<LaunchDataUserInput>(defaultUserInput);

    return (
        <main>
            <Link href="/faq">
                <Image className={styles.help} width={40} height={40} src="/images/help.png" alt="Help" />
            </Link>

            {screen === "token" && <TokenPage newLaunchData={newLaunchData} setScreen={setScreen} />}

            {screen === "details" && <DetailsPage newLaunchData={newLaunchData} setScreen={setScreen} />}

            {screen === "book" && <BookPage newLaunchData={newLaunchData} setScreen={setScreen} />}
        </main>
    );
};

export default Launch;