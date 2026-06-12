import { patcher } from "@bunny/api";
import { findByProps } from "@bunny/metro";
import { clipboard, React } from "@bunny/metro/common";
import { findInReactTree } from "@bunny/utils";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const { showToast } = findByProps("showToast") ?? {};
const { getAssetIDByName } = findByProps("getAssetIDByName") ?? {};

export default {
    onLoad() {
        let currentMessage = null;
        this.patches = [];

        this.patches.push(
            patcher.before("openLazy", LazyActionSheet, ([component, key, extra]) => {
                if (key !== "MessageLongPressActionSheet") return;
                currentMessage = extra?.message ?? null;
                if (!currentMessage) return;

                component.then(mod => {
                    const unpatch = patcher.after("default", mod, (_, comp) => {
                        const buttons = findInReactTree(
                            comp,
                            x => Array.isArray(x) && x.length > 0 && x[0]?.props?.label
                        );
                        if (!buttons) return;

                        const hasOurs = buttons.some(
                            b => b?.props?.["data-rsc-action"]
                        );
                        if (hasOurs) return;

                        const link = `https://discord.com/channels/${currentMessage.guild_id || "@me"}/${currentMessage.channel_id}/${currentMessage.id}`;

                        buttons.push(
                            React.createElement(buttons[0]?.type ?? "View", {
                                label: "Request Action",
                                "data-rsc-action": true,
                                onPress: () => {
                                    clipboard.setString(
                                        `UID: ${currentMessage.author.id}\nReason: \nAction: \nPROOF: ${link}`
                                    );
                                    showToast?.(
                                        "Copied to clipboard",
                                        getAssetIDByName?.("CopyIcon")
                                    );
                                },
                            })
                        );
                    });

                    this.patches.push(unpatch);
                });
            })
        );
    },

    onUnload() {
        (this.patches ?? []).forEach(p => p());
    },
};
