import { patcher } from "@bunny/api";
import { findByProps } from "@bunny/metro";
import { clipboard, React } from "@bunny/metro/common";
import { findInReactTree } from "@bunny/utils";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const { showToast } = findByProps("showToast") ?? {};
const { getAssetIDByName } = findByProps("getAssetIDByName") ?? {};

export default {
    onLoad() {
        const patches = [];

        patches.push(
            patcher.before("openLazy", LazyActionSheet, ([component, key, msg]) => {
                const message = msg?.message;
                if (key !== "MessageLongPressActionSheet" || !message) return;

                component.then(mod => {
                    const sheet = mod?.default || mod;
                    if (typeof sheet !== "function") return;

                    const link = `https://discord.com/channels/${message.guild_id || "@me"}/${message.channel_id}/${message.id}`;

                    const unp = patcher.after("default", { default: sheet }, (_, comp) => {
                        React.useEffect(() => () => unp(), []);

                        const buttons = findInReactTree(
                            comp,
                            x => x?.[0]?.type?.name === "ButtonRow"
                        );
                        if (!buttons) return comp;

                        const ButtonType = buttons[0]?.type;
                        if (!ButtonType) return comp;

                        buttons.push(
                            React.createElement(ButtonType, {
                                label: "Request Action",
                                icon: getAssetIDByName?.("CopyIcon"),
                                onPress: () => {
                                    clipboard.setString(
                                        `UID: ${message.author.id}\nReason: \nAction: \nPROOF: ${link}`
                                    );
                                    showToast?.("Copied to clipboard", getAssetIDByName?.("CopyIcon"));
                                },
                            })
                        );
                    });

                    patches.push(unp);
                });
            })
        );

        this.unpatch = () => patches.forEach(p => p());
    },

    onUnload() {
        this.unpatch?.();
    },
};
