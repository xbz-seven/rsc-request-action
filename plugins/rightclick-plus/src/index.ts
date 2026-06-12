import { patcher } from "@bunny/api";
import { findByProps } from "@bunny/metro";
import { clipboard, React, ReactNative } from "@bunny/metro/common";
import { findInReactTree } from "@bunny/utils";
import { definePluginSettings } from "@bunny/api/settings";

const LazyActionSheet = findByProps("openLazy", "hideActionSheet");
const { showToast } = findByProps("showToast") ?? {};
const { getAssetIDByName } = findByProps("getAssetIDByName") ?? {};

interface ButtonDef {
    id: string;
    name: string;
    type: "copy" | "command";
    template: string;
}

const settings = definePluginSettings({
    buttons: {
        type: 5,
        default: "[]",
        description: ""
    }
});

function getButtons(): ButtonDef[] {
    try { return JSON.parse(settings.store.buttons || "[]"); }
    catch { return []; }
}

function saveButtons(btns: ButtonDef[]) {
    settings.store.buttons = JSON.stringify(btns);
}

function genId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const VARS: Record<string, (m: any) => string> = {
    "{userid}": m => m.author.id,
    "{userping}": m => "<@" + m.author.id + ">",
    "{username}": m => m.author.username,
    "{msgid}": m => m.id,
    "{channelid}": m => m.channel_id,
    "{guildid}": m => m.guild_id || "@me",
    "{msgcontent}": m => m.content || "",
};

function fill(template: string, msg: any): string {
    let r = template;
    for (const [k, fn] of Object.entries(VARS)) {
        r = r.replace(new RegExp(k.replace(/[{}]/g, "\\$&"), "g"), fn(msg));
    }
    return r;
}

function ButtonForm({ initial, onSave, onCancel }: {
    initial: ButtonDef | null;
    onSave: (b: ButtonDef) => void;
    onCancel: () => void;
}) {
    const [name, setName] = React.useState(initial?.name ?? "");
    const [type, setType] = React.useState<"copy" | "command">(initial?.type ?? "copy");
    const [template, setTemplate] = React.useState(initial?.template ?? "");

    return React.createElement(ReactNative.ScrollView, { style: { padding: 12 } },
        React.createElement(ReactNative.View, { style: { marginBottom: 12 } },
            React.createElement(ReactNative.Text, { style: { color: "var(--header-primary)", marginBottom: 4, fontSize: 14, fontFamily: "var(--font-primary)" } }, "Button Name"),
            React.createElement(ReactNative.TextInput, {
                style: {
                    backgroundColor: "var(--input-background)",
                    color: "var(--text-normal)",
                    padding: 10,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: "var(--profile-body-border-color)",
                    fontFamily: "var(--font-primary)",
                    fontSize: 14,
                },
                value: name,
                onChangeText: setName,
                placeholder: 'e.g. "Copy User ID"',
                placeholderTextColor: "var(--text-muted)",
            }),
        ),
        React.createElement(ReactNative.View, { style: { marginBottom: 12 } },
            React.createElement(ReactNative.Text, { style: { color: "var(--header-primary)", marginBottom: 4, fontSize: 14, fontFamily: "var(--font-primary)" } }, "Action Type"),
            React.createElement(ReactNative.View, { style: { flexDirection: "row", gap: 8 } },
                ["copy", "command"].map(t =>
                    React.createElement(ReactNative.TouchableOpacity, {
                        key: t,
                        onPress: () => setType(t as any),
                        style: {
                            flex: 1,
                            padding: 10,
                            borderRadius: 4,
                            backgroundColor: type === t ? "var(--brand-experiment)" : "var(--background-secondary)",
                            alignItems: "center",
                        },
                    }, React.createElement(ReactNative.Text, {
                        style: {
                            color: type === t ? "white" : "var(--text-normal)",
                            fontFamily: "var(--font-primary)",
                            fontSize: 13,
                            textTransform: "capitalize",
                        },
                    }, t === "copy" ? "Copy Text" : "Run Command")),
                ),
            ),
        ),
        React.createElement(ReactNative.View, { style: { marginBottom: 12 } },
            React.createElement(ReactNative.Text, { style: { color: "var(--header-primary)", marginBottom: 4, fontSize: 14, fontFamily: "var(--font-primary)" } }, "Template"),
            React.createElement(ReactNative.TextInput, {
                style: {
                    backgroundColor: "var(--input-background)",
                    color: "var(--text-normal)",
                    padding: 10,
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: "var(--profile-body-border-color)",
                    fontFamily: "var(--font-primary)",
                    fontSize: 13,
                    minHeight: 100,
                    textAlignVertical: "top",
                },
                value: template,
                onChangeText: setTemplate,
                multiline: true,
                placeholder: "UID: {userid}\nReason: \nAction: \nProof: {msgid}",
                placeholderTextColor: "var(--text-muted)",
            }),
        ),
        React.createElement(ReactNative.View, { style: { marginBottom: 12 } },
            React.createElement(ReactNative.Text, { style: { color: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-primary)" } },
                "Available variables: {userid}, {userping}, {username}, {msgid}, {channelid}, {guildid}, {msgcontent}"),
        ),
        React.createElement(ReactNative.View, { style: { flexDirection: "row", gap: 8, marginTop: 8 } },
            React.createElement(ReactNative.TouchableOpacity, {
                onPress: onCancel,
                style: { flex: 1, padding: 12, borderRadius: 4, backgroundColor: "var(--background-secondary)", alignItems: "center" },
            }, React.createElement(ReactNative.Text, { style: { color: "var(--text-normal)", fontFamily: "var(--font-primary)", fontSize: 14 } }, "Cancel")),
            React.createElement(ReactNative.TouchableOpacity, {
                onPress: () => {
                    if (!name.trim()) return;
                    onSave({
                        id: initial?.id ?? genId(),
                        name: name.trim(),
                        type,
                        template,
                    });
                },
                style: { flex: 1, padding: 12, borderRadius: 4, backgroundColor: "var(--brand-experiment)", alignItems: "center" },
            }, React.createElement(ReactNative.Text, { style: { color: "white", fontFamily: "var(--font-primary)", fontSize: 14, fontWeight: "600" } }, "Save")),
        ),
    );
}

function SettingsPanel() {
    const [buttons, setButtons] = React.useState<ButtonDef[]>(getButtons);
    const [showForm, setShowForm] = React.useState(false);
    const [editing, setEditing] = React.useState<ButtonDef | null>(null);
    const [, forceUpdate] = React.useState(0);

    function handleSave(btn: ButtonDef) {
        if (editing) {
            const next = buttons.map(b => b.id === btn.id ? btn : b);
            saveButtons(next);
            setButtons(next);
        } else {
            const next = [...buttons, btn];
            saveButtons(next);
            setButtons(next);
        }
        setShowForm(false);
        setEditing(null);
    }

    function handleDelete(id: string) {
        const next = buttons.filter(b => b.id !== id);
        saveButtons(next);
        setButtons(next);
    }

    if (showForm) {
        return React.createElement(ReactNative.View, { style: { flex: 1 } },
            React.createElement(ReactNative.View, {
                style: {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "var(--profile-body-border-color)",
                },
            },
                React.createElement(ReactNative.Text, { style: { color: "var(--header-primary)", fontSize: 16, fontFamily: "var(--font-primary)", fontWeight: "600" } },
                    editing ? "Edit Button" : "New Button",
                ),
            ),
            React.createElement(ButtonForm, { initial: editing, onSave: handleSave, onCancel: () => { setShowForm(false); setEditing(null); } }),
        );
    }

    return React.createElement(ReactNative.ScrollView, { style: { flex: 1 } },
        React.createElement(ReactNative.View, { style: { padding: 12 } },
            React.createElement(ReactNative.Text, { style: { color: "var(--text-muted)", fontSize: 12, fontFamily: "var(--font-primary)", marginBottom: 12 } },
                "Add custom buttons to Discord's message right-click menu. Each button can copy text with dynamic variables or run a command.",
            ),
            buttons.length === 0 && React.createElement(ReactNative.View, {
                style: { padding: 20, borderRadius: 4, backgroundColor: "var(--background-secondary)", alignItems: "center", marginBottom: 12 },
            }, React.createElement(ReactNative.Text, { style: { color: "var(--text-muted)", fontFamily: "var(--font-primary)", fontSize: 13 } }, "No custom buttons yet")),
            buttons.map(b =>
                React.createElement(ReactNative.View, {
                    key: b.id,
                    style: { flexDirection: "row", alignItems: "center", padding: 10, marginBottom: 6, borderRadius: 4, backgroundColor: "var(--background-secondary)" },
                },
                    React.createElement(ReactNative.View, { style: { flex: 1 } },
                        React.createElement(ReactNative.Text, { style: { color: "var(--header-primary)", fontFamily: "var(--font-primary)", fontSize: 14 } }, b.name),
                        React.createElement(ReactNative.Text, { style: { color: "var(--text-muted)", fontFamily: "var(--font-primary)", fontSize: 11 } },
                            b.type === "copy" ? "Copies text" : "Runs command"),
                    ),
                    React.createElement(ReactNative.TouchableOpacity, {
                        onPress: () => { setEditing(b); setShowForm(true); },
                        style: { padding: 6, marginRight: 4 },
                    }, React.createElement(ReactNative.Text, { style: { color: "var(--text-link)", fontSize: 13, fontFamily: "var(--font-primary)" } }, "Edit")),
                    React.createElement(ReactNative.TouchableOpacity, {
                        onPress: () => handleDelete(b.id),
                        style: { padding: 6 },
                    }, React.createElement(ReactNative.Text, { style: { color: "var(--status-danger)", fontSize: 13, fontFamily: "var(--font-primary)" } }, "Delete")),
                ),
            ),
            React.createElement(ReactNative.TouchableOpacity, {
                onPress: () => { setEditing(null); setShowForm(true); },
                style: { padding: 12, borderRadius: 4, backgroundColor: "var(--brand-experiment)", alignItems: "center", marginTop: 4 },
            }, React.createElement(ReactNative.Text, { style: { color: "white", fontFamily: "var(--font-primary)", fontSize: 14, fontWeight: "600" } }, "+ New Button")),
        ),
    );
}

export default {
    settings,
    settingsPanel: SettingsPanel,

    onLoad() {
        this.patches = [];

        this.patches.push(
            patcher.before("openLazy", LazyActionSheet, ([component, key, extra]) => {
                if (key !== "MessageLongPressActionSheet") return;
                const msg = extra?.message ?? null;
                if (!msg) return;

                component.then(mod => {
                    const unpatch = patcher.after("default", mod, (_, comp) => {
                        const buttons = findInReactTree(
                            comp,
                            x => Array.isArray(x) && x.length > 0 && x[0]?.props?.label
                        );
                        if (!buttons) return;

                        const customButtons = getButtons();
                        if (customButtons.length === 0) return;

                        for (const cb of customButtons) {
                            const key = "rcp-" + cb.id;
                            const exists = buttons.some(b => b?.props?.["data-rcp"] === key);
                            if (exists) continue;

                            if (cb.type === "copy") {
                                buttons.push(
                                    React.createElement(buttons[0]?.type ?? "View", {
                                        label: cb.name,
                                        "data-rcp": key,
                                        onPress: () => {
                                            const text = fill(cb.template, msg);
                                            clipboard.setString(text);
                                            showToast?.(
                                                "Copied to clipboard",
                                                getAssetIDByName?.("CopyIcon")
                                            );
                                        },
                                    })
                                );
                            }
                        }
                    });
                    this.patches.push(unpatch);
                });
            })
        );
    },

    onUnload() {
        (this.patches ?? []).forEach(p => p());
    },
}
