// TODO: Namespace

namespace Menu {
    export type MenuAction = () => void;

    export class MenuEntry {
        entryType: MenuEntryType;
        label: string;
        action: MenuAction | Menu;

        constructor(entryType: MenuEntryType, label: string, action: MenuAction | Menu) {
            this.entryType = entryType;
            this.label = label;
            this.action = action;
        }
    }

    export enum MenuEntryType {
        Submenu = 0,
        Command = 1
    }

    export class Menu {
        entries: MenuEntry[];

        constructor(entries: MenuEntry[]) {
            this.entries = entries;
        }
    }
}

export { Menu };