/**
 * 
 * Filter
 * FilterArg
 * StringArg
 * StringCombinator
 * 
 * 
 * Filter (StringCombinator)* StringArg
 * 
 * Maybe just start with string arg
 * 
 * | "abc " "xyz" "123" ; implicit combinator
 * 
 * StringCombinator String String
 * 
 * Note: Combinator classification depends on immediate following arg
 */

import { storage } from "src/storage";
import { Util } from "./util";

// First step: tokenize
namespace Bart {
    export interface Tab {
        title: string
        url: string
        windowId: number
        id: number

        [field: string]: any;
    }

    export interface Storage {
        get(key: string): Promise<any>;
        set(items: { [key: string]: any }): Promise<void>;
        erase(): Promise<void>;
    }

    export interface Context {
        currentWindowId: number
        selectedTabIds: Set<number>;
        storage: Storage;
    }

    export class ChromeLocalStorage implements Storage {
        private storage: chrome.storage.StorageArea = chrome.storage.local; 

        async get(key: string): Promise<any> {
            return await this.storage.get(key);
        }

        async set(items: { [key: string]: any }): Promise<void> {
            this.storage.set(items);
        }

        async erase() {
            // TODO
        }
    }

    export class Browser {
        // TODO: getter for 'Context'?

        // TODO -- folder name optional
        // TODO -- allow specification of folder hierarchy
        async bookmark(tabs: Tab[], folderName: string) {
            // Creates a folder in 'Other Bookmarks' by default
            let folderNode = await chrome.bookmarks.create({ title: folderName });

            for (const tab of tabs) {
                await chrome.bookmarks.create({ title: tab.title, parentId: folderNode.id, url: tab.url });
            }
        }

        async move(tabs: Tab[], windowId?: number) {
            if (windowId == undefined) {
                windowId = (await chrome.windows.create({focused: false})).id;
            }

            let tabIds = tabs.map(tab => tab.id);
            await chrome.tabs.move(tabIds, {index: -1, windowId: windowId});
        }
    }

    export class TabContext implements Context {
        currentWindowId: number
        selectedTabIds: Set<number>
        storage: Storage
    }

    export class DummyTab implements Tab {
        title: string
        url: string
        windowId: number
        id: number

        constructor(title: string, url: string, windowId: number = 0, id: number = 0) {
            this.title = title;
            this.url = url;
            this.windowId = windowId;
            this.id = id;
        }
    }

    export type TabFilter = (tab: Tab, context: Context) => Promise<boolean>;
    export type StringFilter = (str: string) => boolean;

    export namespace Lexer {
        export class Token {
            start: number;
            end: number;
            type: TokenType;
            value: string;

            constructor(
                // Start of the lexical token in the string, inclusive.
                start: number,
                // End of the lexical token in the string, inclusive.
                end: number,
                type: TokenType,
                value: string
            ) {
                this.start = start;
                this.end = end;
                this.type = type;
                this.value = value;
            }

            get highlight(): string {
                let bartClass = "bart-undefined";

                switch (this.type) {
                    case TokenType.StringArg:
                        bartClass = "bart-string";
                        break;
                    case TokenType.Combinator:
                        bartClass = "bart-combinator";
                        break;
                    case TokenType.Command:
                        bartClass = "bart-command";
                        break;
                    case TokenType.Filter:
                        bartClass = "bart-filter";
                        break;
                    case TokenType.Invalid:
                        bartClass = "bart-invalid";
                        break;
                    case TokenType.Negation:
                        bartClass = "bart-combinator";
                        break;
                    case TokenType.GroupModifier:
                        bartClass = "bart-group-modifier";
                        break;
                    case TokenType.SortModifier:
                        bartClass = "bart-sort-modifier"
                        break;
                    case TokenType.Integer:
                        bartClass = "bart-integer";
                        break;
                    case TokenType.Arithmetic:
                        bartClass = "bart-arithmetic";
                        break;
                    case TokenType.Macro:
                        bartClass = "bart-macro";
                        break;
                    case TokenType.TimeUnit:
                        bartClass = "bart-time-unit";
                        break;
                    case TokenType.BinaryRelation:
                        bartClass = "bart-binary-relation";
                        break;
                }

                let explodedValue = 
                    explode(this.value)
                        .map((char, index) => `<span class="bart-filter-char" id="bart-filter-char-${index+this.start}">${char}</span>`)
                        .join('');

                return `<span class="${bartClass}">${explodedValue}</span>`
            }
        }

        export class RawToken {
            start: number;
            end: number;
            value: string;

            constructor(
                start: number,
                end: number,
                value: string
            ) {
                this.start = start;
                this.end = end;
                this.value = value;
            }
        }

        enum TokenState {
            QUOTE,
            TOKEN,
            WHITESPACE  // necessary?
        }

        export enum TokenType {
            Invalid,
            StringArg,
            Filter,
            Negation,
            Combinator,
            Command,
            GroupModifier,
            SortModifier,
            Macro,
            Integer,
            Arithmetic,
            TimeUnit,
            BinaryRelation
        }

        export function isGroupModifier(token: string): boolean {
            return token == "group";
        }

        export function isSortModifier(token: string): boolean {
            return token == 'sort';
        }

        export function isTimeUnit(token: string): boolean {
            return /^(\d+)d$/.test(token)
                || /^(\d+)h$/.test(token)
                || /^(\d+)m$/.test(token)
                || /^(\d+)s$/.test(token);
        }

        export function isBinaryRelation(token: string): boolean {
            return new Set(['>', '<', 'has', '==']).has(token);
        }

        export function isString(token: string): boolean {
            return token.startsWith('"') && token.endsWith('"');
        }

        export function isArithmetic(token: string) {
            return new Set([ '+', '-', '*', '/' ]).has(token);
        }

        export function isInteger(token: string): boolean {
            return /^\d+$/.test(token);
        }

        export function isMacro(token: string): boolean {
            return token.startsWith('$') && token.length > 1;
        }

        export function isFilter(token: string): boolean {
            return [ 
                'title', 't',
                'url', 'u',
                'curr', '.',
                '$', 
                'windowId', 'w',
                'since', ':',
                'uniq', '%' 
            ].includes(token);
        }

        export function isNegation(token: string): boolean {
            return token == '!';
        }

        export function isCombinator(token: string): boolean {
            return ['|', '&'].includes(token);
        }

        export function isCommand(token: string): boolean {
            return ['bm', 'move'].includes(token);
        }

        export function tokenize(input: string): RawToken[] {
            var tokenStart = 0;
            var tokenState: TokenState = undefined;
            var tokens: RawToken[] = [];

            console.log(`tokenize input: '${input}'`);

            for (var i = 0; i < input.length; i++) {
                let token = input[i];
                console.log(`token ${i}: '${token}' (whitespace: ${input.charAt(i) === " "})`)
                // State is set for tracking the current parsing context
                if (token == '"') {
                    console.log("Hit quote");
                    if (tokenState == TokenState.QUOTE) {
                        // Quote closed; (TODO: Handle escapes?)
                        tokenState = undefined;
                        tokens.push(new RawToken(tokenStart, i, input.slice(tokenStart, i+1)));
                    } else {
                        tokenStart = i;
                        // Can ignore all other inputs
                        tokenState = TokenState.QUOTE;
                        if (i == input.length-1) {
                            console.log('End of string -- terminating');
                            // End of string -- this is the end of the token
                            tokens.push(new RawToken(tokenStart, i, input.slice(tokenStart, i+1)));
                        }
                    }
                } else if (token === " ") {
                    console.log('lex: hit whitespace');
                    // Ignore whitespace
                    if (tokenState == TokenState.TOKEN) {
                        console.log('terminating token');
                        // This delineates the end of the token sequence;
                        // slice the token here and return it.
                        tokens.push(new RawToken(tokenStart, i-1, input.slice(tokenStart, i)));
                        tokenState = undefined;
                    } else {
                        console.log('whitespace, skipping');
                    }
                } else {
                    console.log('token match');
                    if (tokenState == undefined) {
                        tokenStart = i;
                        tokenState = TokenState.TOKEN;
                    }

                    if (i == input.length-1) {
                        console.log('End of string -- terminating');
                        // End of string -- this is the end of the token
                        tokens.push(new RawToken(tokenStart, i, input.slice(tokenStart, i+1)));
                    } else if (tokenState == TokenState.QUOTE) {
                        continue;
                    } 
                }
            }

            return tokens;
        }

        export function lex(input: string): Token[] {
            console.log('lex input: ' + input);
            var tokenizedInput = Bart.Lexer.tokenize(input);
            var tokens: Bart.Lexer.Token[] = [];

            // TODO: start/end position included in `tokenize` output
            for (const token of tokenizedInput) {
                if (token.value.startsWith('"')) {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.StringArg, token.value));
                } else if (Bart.Lexer.isFilter(token.value)) {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.Filter, token.value));
                } else if (Bart.Lexer.isNegation(token.value)) {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.Negation, token.value));
                } else if (Bart.Lexer.isCombinator(token.value)) {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.Combinator, token.value));
                } else if (Bart.Lexer.isCommand(token.value)) {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.Command, token.value));
                } else if (Bart.Lexer.isGroupModifier(token.value)) {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.GroupModifier, token.value));
                } else if (Bart.Lexer.isSortModifier(token.value)) {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.SortModifier, token.value));
                } else if (Bart.Lexer.isMacro(token.value)) {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.Macro, token.value));
                } else if (Bart.Lexer.isInteger(token.value)) {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.Integer, token.value));
                } else if (Bart.Lexer.isArithmetic(token.value)) {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.Arithmetic, token.value));
                } else if (Bart.Lexer.isTimeUnit(token.value)) {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.TimeUnit, token.value));
                } else if (Bart.Lexer.isBinaryRelation(token.value)) {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.BinaryRelation, token.value));
                } else {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.Invalid, token.value));
                    //throw new Parser.ParseError();
                }
            }

            return tokens;
        }

        function explode(input: string): string[] {
            let exploded: string[] = [];
            for (const char of input) {
                exploded.push(char);
            }

            return exploded;
        }

        export function highlight(input: string): string {
            let tokens: Token[] = lex(input);
            console.log('highlight tokens: ');
            console.log(tokens);
            let highlight = "";

            for (var i = 0; i < tokens.length; i++) {
                highlight += tokens[i].highlight;
                if (i < tokens.length-1) {
                    highlight += "<span>";
                    let spacePaddingCount = ((tokens[i+1].start - tokens[i].end) - 1);
                    for (var j = 0; j < spacePaddingCount; j++) {
                        highlight += " ";
                   }
                    highlight += "</span>";
                }
            }

            // Preserve any trailing whitespace
            if (tokens.length > 0) {
                let trailingWhitespaceCount = (input.length-1)-tokens[tokens.length-1].end;
                highlight += "<span>";
                for (i = 0; i < trailingWhitespaceCount; i++) {
                    highlight += " ";
                }
                highlight += "</span>";
            }

            return highlight;
        }
    }

    export abstract class PrettyPrint {
        abstract print(): string;
    }

    export namespace Parser {
        export class ParseError extends Error {}

        export class SortModifier {
            field: string;
            relation: string;
            storage: Storage;

            constructor(field: string, relation: string, storage: Storage = new ChromeLocalStorage()) {
                this.field = field;
                this.relation = relation;
                this.storage = storage;
            }

            buildComparator(): Util.AsyncComparator<Tab> {
                let relation = (a,b) => a < b;
                if (this.relation == '>') {
                    relation = (a,b) => a > b;
                }

                if (this.field == 'timestamp') {
                    return async (a,b) => {
                        let aTimestamp = (await this.storage.get(a.id+''));
                        let bTimestamp = await this.storage.get(b.id+'');

                        if (aTimestamp) {
                            aTimestamp = aTimestamp[a.id+''];
                        } else {
                            aTimestamp = 0;
                        }

                        if (bTimestamp) {
                            bTimestamp = bTimestamp[b.id+''];
                        } else {
                            bTimestamp = 0;
                        }

                        return relation(aTimestamp, bTimestamp);
                    }
                } else {
                    return async (a,b) => {
                        return relation(a,b);
                    }
                }
            }

            async sort(tabs: Tab[]): Promise<Tab[]> {
                let comparator = this.buildComparator();
                return await Util.asyncSort(tabs, comparator);
            }
        }

        export class GroupModifier {
            modifier: string;

            constructor(modifier: string) {
                this.modifier = modifier;
            }

            private get groupingProperty(): (tab: Tab) => string {
                return (tab: Tab) => {
                    if (this.modifier == 'window') {
                        return tab.windowId + '';
                    } else if (this.modifier == 'domain') {
                        return new URL(tab.url).hostname;
                    }

                    return tab.id + '';
                };
            }

            group(tabs: Tab[]): Record<string, Tab[]> {
                if (this.modifier == 'none') {
                    return {'none': tabs};
                }

                let grouped: Record<string, Tab[]> = {};

                let property = this.groupingProperty;
                for (const tab of tabs) {
                    let key: string = property(tab);
                    if ((key in grouped) == false) {
                        grouped[key] = [];
                    }

                    grouped[key].push(tab);
                }

                return grouped;
            }

            static get none(): GroupModifier {
                return new GroupModifier("none");
            }

            static valid(modifier: string): boolean {
                return ['window', 'domain', 'none'].includes(modifier);
            }
        }

        export class StringCombinator extends PrettyPrint {
            combinator: string
            strings: string[]
            // If there is a nested combinator it is pointed to here
            children: StringCombinator[]
            relation: string;

            constructor(
                combinator: string,
                strings: Lexer.Token[],
                children: StringCombinator[] = []
            ) {
                super();
                this.combinator = combinator;
                this.strings = strings.map(s => s.value);
                this.children = children;
                this.relation = 'has';
            }

            print(): string {
                let result = `<span class="bart-combinator">${this.combinator}</span>` +
                    ' ' + '<span class="bart-string">' + this.strings.join(' ') + '</span>'
                    + ' ' + this.children.map(c => c.print()).join(' ');

                return result;
            }

            private get operator(): ((a: string, b: string) => boolean) {
                switch (this.relation) {
                    case '==':
                        return (a: string, b: string) => a == b;
                    case '>':
                        return (a: string, b: string) => parseInt(a) > parseInt(b);
                    case '<':
                        return (a: string, b: string) => parseInt(a) < parseInt(b);
                    default:
                        return (a: string, b:string) => a.includes(b);
                }
            }

            filter(): StringFilter {
                let stringMatcher: StringFilter = (str: string) => {
                    let op = this.operator;
                    let cast = (t) => t;

                    if (this.relation == '<' || this.relation == '>') {
                        cast = (t) => parseInt(t);
                    }

                    str = cast(str.toLowerCase());
                    let matches = this.strings.map(s => op(str, cast(s.toLowerCase().slice(1,-1))));

                    // Negation can _only_ bind to a single string
                    if (this.combinator == '!') {
                        console.log('String combinator negation: ' + this.strings);
                        return !op(str, cast(this.strings[0].toLowerCase().slice(1,-1)));
                    }

                    for (const child of this.children) {
                        let filter = child.filter();
                        matches.push(filter(str));
                    }

                    if (this.combinator == '&') {
                        return matches.every(a => a);
                    } else {
                        // '|' combinator
                        return matches.some(a => a);
                    }
                };

                return stringMatcher;
            }

            // A string combinator that always matches on any argument.
            static get emptyCombinator(): StringCombinator {
                // [].every(a => a) is true vacuously.
                let combinator = new StringCombinator('&', []);
                return combinator;
            }

            get quoteless(): string[] {
                return this.strings.map(str => str.slice(1,-1));
            }
        }

        // TODO: Static builder from string
        enum FilterType {
            Title,
            Url,
            Curr,
            WindowId,
            Since,
            Uniq,
            Selected    // $
        }

        namespace FilterType {
            export function tabKey(type: FilterType): string | undefined {
                switch (type) {
                    case FilterType.Title:
                        return "title";
                    case FilterType.Url:
                        return "url"
                    default:
                        return undefined;
                }
            }
        }

        export class Filter extends PrettyPrint {
            type: string
            arg: StringCombinator

            cachedFilter: TabFilter | undefined;

            constructor(
                type: string,
                arg: StringCombinator
            ) {
                super();
                this.type = type;
                this.arg = arg;
                this.cachedFilter = undefined;
            }

            get filterType(): FilterType | undefined {
                let nameMap = [
                    { names: ['title', 't'], type: FilterType.Title },
                    { names: ['url', 'u'], type: FilterType.Url },
                    { names: ['curr', '.'], type: FilterType.Curr },
                    { names: ['windowId', 'wId'], type: FilterType.WindowId },
                    { names: ['since', ':'], type: FilterType.Since },
                    { names: ['uniq', '%'], type: FilterType.Uniq },
                    { names: ['$'], type: FilterType.Selected }
                ];

                for (const pair of nameMap) {
                    if (pair.names.includes(this.type)) {
                        return pair.type;
                    }
                }

                return undefined;
            }

            print(): string {
                return `<span class="bart-filter">${this.type}</span>` +
                    ' ' + this.arg.print();
            }

            filter(context: Context): TabFilter {
                if (this.cachedFilter) {
                    console.log('Hit cached filter');
                    return this.cachedFilter;
                } else {
                    console.log('Setting filter');

                    switch (this.filterType) {
                        case FilterType.Curr:
                            this.cachedFilter = async (tab: Tab, context: Context) => { return tab.windowId == context.currentWindowId };
                            break;
                        case FilterType.WindowId:
                            break;
                        case FilterType.Since:
                            this.cachedFilter = async (tab: Tab, context: Context) => { 
                                let tabTimestamp = await context.storage.get(tab.id+'');
                                if (tabTimestamp) {
                                    tabTimestamp = tabTimestamp[tab.id+''];
                                } else {
                                    tabTimestamp = 0;
                                }

                                let now = Math.floor(Date.now()/1000);
                                tabTimestamp = tabTimestamp ?? 0;

                                if (this.arg.relation == 'has') {
                                    this.arg.relation = '<';
                                }

                                let combinator = this.arg.filter();
                                let elapsedTime = now - tabTimestamp;

                                return combinator(elapsedTime+'');
                            };
                            break;
                        case FilterType.Uniq:
                            let statefulFilter = () => {
                                console.log('Building stateful filter');
                                const prev = new Set();
                                return async (tab: Tab, context: Context): Promise<boolean> => {
                                    let field = 'url';
                                    if (this.arg.strings.length > 0) {
                                        field = this.arg.strings[0].slice(1,-1);
                                    }

                                    if (prev.has(tab[field]+'')) {
                                        return false;
                                    }

                                    prev.add(tab[field]+'');
                                    return true;
                                }
                            }

                            this.cachedFilter = statefulFilter();
                            break;
                        case FilterType.Selected:
                            this.cachedFilter = async (tab: Tab, context: Context) => { return context.selectedTabIds.has(tab.id) };
                            break;
                        default:
                            let stringFilter = this.arg.filter();
                            let tabKey = FilterType.tabKey(this.filterType);
                            this.cachedFilter = async (tab: Tab, context: Context) => { return stringFilter(tab[tabKey]+'') };
                            break;
                    }

                    return this.cachedFilter;
                }
            }

            static get matchAllFilter(): FilterCombinator {
                return new MatchAllFilterCombinator();
            }
        }

        export class FilterCombinator extends PrettyPrint {
            combinator: string
            filters: Filter[]
            child?: FilterCombinator

            cachedFilter: TabFilter | undefined;
            cachedFilters: TabFilter[] | undefined;

            constructor(
                combinator: string,
                filters: Filter[],
                child?: FilterCombinator
            ) {
                super();
                this.combinator = combinator;
                this.filters = filters;
                this.child = child;
                this.cachedFilter = undefined;
            }

            print(): string {
                let result = `<span class="bart-combinator">${this.combinator}</span>` 
                    + ' ' + this.filters.map(f => f.print()).join(' ');

                if (this.child != undefined) {
                    result += this.child.print();
                }

                return result;
            }

            filter(): TabFilter {
                if (this.cachedFilter) {
                    console.log('Hit cached combinator filter');
                    return this.cachedFilter;
                } else {
                    console.log('setting combinator filter cache');
                    console.log('filter combinator: %o', this);
                    this.cachedFilter = async (tab: Tab, context: Context) => {
                        // A tab must match all filters
                        if (this.cachedFilters == undefined) {
                            this.cachedFilters = this.filters.map(f => f.filter(context));
                        }

                        let filters = this.cachedFilters;
                        // TODO: Handle child filter
                        let childResult = this.combinator == '&';   // false for '|' case 
                        if (this.child) {
                            let childFilter = this.child.filter();
                            childResult = await childFilter(tab, context);
                        }

                        if (this.combinator == '&') {
                            let promises: Promise<boolean>[] = filters.map(f => f(tab, context));
                            let results: boolean[] = await Promise.all(promises);
                            return results.every(result => result) && childResult;
                        } else if (this.combinator == '|') {
                            return (await Promise.all(filters.map(f => f(tab, context)))).some(result => result) || childResult;
                        } else {
                            // Interpret error (should be impossible..)
                        }
                    }

                    return this.cachedFilter;
                }
            }
        }

        export class MatchAllFilterCombinator extends FilterCombinator {
            constructor() {
                super('', []);
            }

            override filter(): TabFilter {
                return async (tab) => true;
            }
        }

        export class Command extends Bart.PrettyPrint {
            type: string
            args: StringCombinator | undefined
            filter: FilterCombinator | undefined
            groupModifier: GroupModifier;
            sortModifier: SortModifier | undefined;
            browser: Browser;

            constructor(
                type: string,
                args: StringCombinator | undefined,
                filter: FilterCombinator | undefined,
                groupModifier: GroupModifier = GroupModifier.none,
                sortModifier: SortModifier | undefined = undefined,
                browser: Browser = new Browser()
            ) {
                super();
                this.type = type;
                this.args = args;
                this.filter = filter;
                this.groupModifier = groupModifier;
                this.sortModifier = sortModifier;
                this.browser = browser;
            }

            print(): string {
                return `<span class="bart-command">${this.type}</span>` +
                    (this.args?.strings?.length > 0 ? " " : "") +
                    (this.args?.print() ?? "") +
                    (this.filter?.print() ?? "");
            }

            // TODO: Filter the tabs here instead..? And then return them?
            async execute(filteredTabs: Tab[]) {
                switch (this.type) {
                    case '.':
                        // Do nothing.
                        console.log('noop, moving along.')
                        break;
                    case 'bm':
                        console.log('Bookmarking filtered tabs');
                        // Should take a single string argument
                        await this.browser.bookmark(filteredTabs, this.args.quoteless[0]);
                        // TODO: Implement bookmarking
                        break;
                    case 'move':
                        console.log('Moving filtered tabs');
                        // Create a new window and move all tabs to it
                        await this.browser.move(filteredTabs);
                        break;
                    default: 
                        console.log('Attempting to execute unrecognized command: ' + this.type);
                        break;
                }
            }

            static noop(browser: Browser = new Browser()): Command {
                let filter = new MatchAllFilterCombinator();
                return new Command('.', StringCombinator.emptyCombinator, filter, GroupModifier.none, undefined, browser);
            }

            modifier(mod: GroupModifier): Command {
                return new Command(
                    this.type,
                    this.args,
                    this.filter,
                    mod,
                    undefined,
                    this.browser
                );
            }
        }

        export function consume(
            tokens: Bart.Lexer.Token[],
            predicate: (token: Bart.Lexer.Token) => boolean
        ): [consumed: Bart.Lexer.Token[], remaining: Bart.Lexer.Token[]] {
            for (var i = 0; i < tokens.length; i++) {
                if (predicate(tokens[i]) == false) {
                    break;
                }
            }

            return [tokens.slice(0, i), tokens.slice(i)];
        }

        // TODO
        export function isStringCombinatorSequence(tokens: Lexer.Token[]): boolean {
            if (tokens.length == 0) {
                return false;
            }

            // First case, implicit '&'
            return Lexer.isString(tokens[0].value) 
                || (Lexer.isCombinator(tokens[0].value) && Lexer.isString(tokens[1].value));
        }

        export function isStringNegationSequence(tokens: Lexer.Token[]): boolean {
            if (tokens.length < 2) {
                return false;
            }

            return tokens[0].value == '!' && Lexer.isString(tokens[1].value);
        }

        export function isFilterCombinatorSequence(tokens: Lexer.Token[]): boolean {
            return Lexer.isCombinator(tokens[0].value) && Lexer.isFilter(tokens[1].value);
        }

        export function consumeSortModifier(tokens: Lexer.Token[], storage: Storage = new ChromeLocalStorage()): [remaining: Lexer.Token[], modifier: SortModifier] {
            if (Lexer.isSortModifier(tokens[0].value) == false) {
                throw new ParseError();
            }

            tokens = tokens.slice(1);
            let relation = '<';
            let field = 'timestamp';

            // TODO: Pattern matching?
            if (tokens.length >= 2 && Lexer.isString(tokens[0].value) && Lexer.isString(tokens[1].value)) {
                relation = tokens[0].value.slice(1,-1);
                field = tokens[1].value.slice(1,-1);
                tokens = tokens.slice(2);
            } else if (tokens.length >= 1 && Lexer.isString(tokens[0].value)) {
                relation = tokens[0].value.slice(1,-1);
                tokens = tokens.slice(1);
            }

            return [tokens, new SortModifier(field, relation, storage)];
        }

        export function consumeGroupModifier(tokens: Lexer.Token[]): [remaining: Lexer.Token[], modifier: GroupModifier] {
            // The first token will be 'group'
            if (Bart.Lexer.isGroupModifier(tokens[0].value) == false) {
                throw new ParseError();
            }

            tokens = tokens.slice(1);

            if (Bart.Lexer.isString(tokens[0].value) == false || GroupModifier.valid(tokens[0].value.slice(1,-1)) == false) {
                throw new ParseError();
            }

            let modifier = new GroupModifier(tokens[0].value.slice(1,-1));
            // Skip the arg
            return [tokens.slice(1), modifier];
        }

        // TODO
        export function consumeStringNegation(
            tokens: Lexer.Token[]
        ): [result: StringCombinator, remaining: Lexer.Token[]] {
            let negatedString = tokens[1];
            return [new StringCombinator('!', [negatedString], []), tokens.slice(2) ];
        }

        export function consumeArithmeticOperators(
            tokens: Lexer.Token[]
        ): [result: number, remaining: Lexer.Token[]] {
            // TODO: Consume until non-valid token
            // TODO: Safety checks
            if (tokens.length < 1 || Lexer.isArithmetic(tokens[0].value) == false) {
                // TODO: What to return for result?
                return [0, tokens];
            }

            let operator = tokens[0];
            let arg1 = tokens[1];
            let arg2 = tokens[2];

            let op = {
                '+': (a,b) => a+b,
                '-': (a,b) => a-b,
                '*': (a,b) => a*b,
                '/': (a,b) => Math.floor(a/b)
            }[operator.value];

            if (Lexer.isArithmetic(arg2.value)) {
                let [subres, newTokens] = consumeArithmeticOperators(tokens.slice(2));
                return [op(parseInt(arg1.value), subres), newTokens];
            } else {
                return [op(parseInt(arg1.value), parseInt(arg2.value)), tokens.slice(3)];
            }
        }

        export function consumeStringCombinator(
            tokens: Lexer.Token[]
        ): [result: StringCombinator, remaining: Lexer.Token[]] {
            let combinator = new StringCombinator('&', [], []);
            if (Lexer.isCombinator(tokens[0].value)) {
                combinator.combinator = tokens[0].value;
                tokens = tokens.slice(1);
            }

            // Iterate tokens here and identify.
            while (tokens.length > 0) {
                if (isStringNegationSequence(tokens)) {
                    // consume, update `tokens` here
                    let [childCombinator, remainder] = consumeStringNegation(tokens);
                    tokens = remainder;
                    combinator.children.push(childCombinator);
                } else if (Lexer.isString(tokens[0].value)) {
                    combinator.strings.push(tokens[0].value);
                    tokens = tokens.slice(1);
                } else if (Lexer.isInteger(tokens[0].value)) {
                    // For now, cast to string
                    combinator.strings.push(`"${tokens[0].value}"`);
                    tokens = tokens.slice(1);
                } else if (isStringCombinatorSequence(tokens)) {
                    let [childCombinator, remainder] = consumeStringCombinator(tokens);
                    tokens = remainder;
                    combinator.children.push(childCombinator);
                } else if (Lexer.isArithmetic(tokens[0].value)) {
                    let [result, remainder] = consumeArithmeticOperators(tokens);
                    console.log('arithmetic result: ' + result);
                    tokens = remainder;
                    combinator.strings.push(`"${result}"`);
                } else {
                    // Parse error?
                    break;
                }
            }

            return [combinator, tokens];
        }

        export function consumeFilterCombinator(
            tokens: Lexer.Token[]
        ): [result: FilterCombinator, remainingTokens: Lexer.Token[] ] {
            // Everything left-to-right (starts from the filter)
            let combinatorType = '&';
            if (Lexer.isCombinator(tokens[0].value)) {
                combinatorType = tokens[0].value;
                tokens = tokens.slice(1);
            }

            console.log('remaining tokens: ' + tokens);

            let filters: Filter[] = [];
            let childCombinator: FilterCombinator = undefined;

            while (tokens.length > 0) {
                console.log(tokens);
                console.log(tokens[0].value);
                // On each iteration, check if combinator or filter and set tokens after.
                if (Lexer.isFilter(tokens[0].value)) {
                    console.log('handling filter: ' + tokens[0].value);
                    let filterType = tokens[0].value;
                    tokens = tokens.slice(1);

                    if (tokens.length == 0) {
                        filters.push(new Filter(filterType, new StringCombinator('&', [])));
                        continue;
                    }

                    // Relations can directly precede combinators
                    let relation = 'has';
                    if (Lexer.isBinaryRelation(tokens[0].value)) {
                        relation = tokens[0].value;
                        tokens = tokens.slice(1);
                    }

                    // Consume filter args; loop until all filters are consumed.
                    let [filterArg, remainder] = consumeStringCombinator(tokens);
                    filterArg.relation = relation;
                    tokens = remainder;
                    console.log('filter remaining tokens: ' + tokens[0]);
                    filters.push(new Filter(filterType, filterArg));
                } else if (isFilterCombinatorSequence(tokens)) {
                    let [filterCombinator, remainder] = consumeFilterCombinator(tokens);
                    filterCombinator.child = filterCombinator;
                    // Should have consumed all tokens here
                    tokens = remainder;
                    break;
                } else if (Bart.Lexer.isGroupModifier(tokens[0].value) || Lexer.isSortModifier(tokens[0].value)) {
                    break;
                } else {
                    throw new ParseError();
                }
            }

            // TODO
            return [ new FilterCombinator(combinatorType, filters, childCombinator), tokens ];
        }

        export function parseStringCombinator(
            tokens: Bart.Lexer.Token[]
        ): [result: StringCombinator, remainingTokens: Bart.Lexer.Token[]] {
            return consumeStringCombinator(tokens);
        }

        export function highlight(root: FilterCombinator) {
        }

        // TODO: Enum?
        function substituteMacro(macro: string, context: Context): Lexer.Token {
            let substitution = '';

            if (macro == '$windowId') {
                substitution = `"${context.currentWindowId}"`;
                return new Lexer.Token(0, 0, Lexer.TokenType.StringArg, substitution);
            }
        }

        // Convert a time unit to its value in seconds
        export function substituteTimeUnit(timeUnit: string): Lexer.Token {
            let parseUnit = /^(\d+)d$/.exec(timeUnit)
                ?? /^(\d+)h$/.exec(timeUnit)
                ?? /^(\d+)m$/.exec(timeUnit)
                ?? /^(\d+)s$/.exec(timeUnit);

            let unit = parseUnit[0].slice(-1);
            let value = parseInt(parseUnit[1]);
            let seconds = 0;

            console.log(`time unit: ${unit} value: ${value}`);

            switch (unit) {
                case 'd':
                    seconds = 60*60*24*value;
                    break;
                case 'h':
                    seconds = 60*60*value;
                    break;
                case 'm':
                    seconds = 60*value;
                    break;
                case 's':
                    seconds = value;
                    break;
            }

            console.log('seconds: ' + seconds);

            return new Lexer.Token(0, 0, Lexer.TokenType.Integer, seconds+'');
        }

        export function substituteMacros(tokens: Bart.Lexer.Token[], context: Context): Bart.Lexer.Token[] {
            for (let i = 0; i < tokens.length; i++) {
                if (tokens[i].type == Bart.Lexer.TokenType.Macro) {
                    tokens[i] = substituteMacro(tokens[i].value, context);
                } else if (tokens[i].type == Bart.Lexer.TokenType.TimeUnit) {
                    tokens[i] = substituteTimeUnit(tokens[i].value);
                }
            }

            return tokens;
        }

        export function parse(input: string, context: Context, storage: Storage = new ChromeLocalStorage()): Command {
            let command: Command = Command.noop();
            let commandSymbol = command.type;
            let commandArgs = StringCombinator.emptyCombinator;

            if (input == '') {
                return command;
            }

            let tokens = Lexer.lex(input);
            tokens = substituteMacros(tokens, context);
            console.log('substituted tokens: ' + tokens.map(f => f.value).join(' '));

            // TODO: Move to separate method
            if (Bart.Lexer.isCommand(tokens[0].value)) {
                commandSymbol = tokens[0].value;
                tokens = tokens.slice(1);
                // Consume any string args here
                [commandArgs, tokens] = consumeStringCombinator(tokens);
            }

            // A command w/out a filter assumes the match-all filter
            let filterCombinator = Filter.matchAllFilter;
            let groupModifier = GroupModifier.none;
            let sortModifier = undefined;

            if (tokens.length > 0) {
                [filterCombinator, tokens] = consumeFilterCombinator(tokens);
            }

            // After all tokens are parsed, group or sort modifier
            // If there is a group modifier it will remain after all other tokens are parsed.
            // Allow group or sort modifier regardless of order
            while (tokens.length > 0) {
                if (tokens[0].value == 'group') {
                    [tokens, groupModifier] = consumeGroupModifier(tokens);
                    console.log('Parsing group modifier');
                } else if (tokens[0].value == 'sort') {
                    // TODO: Consume sort modifier
                    [tokens, sortModifier] = consumeSortModifier(tokens, storage);
                } else {
                    break;
                }
            }

            return new Command(commandSymbol, commandArgs, filterCombinator, groupModifier, sortModifier);
        }
    }

    export namespace Interpreter {
        export function interpret(input: string, tabs: Tab[], context: Context): Tab[] {
            let ast = Parser.parse(input, context);
            console.log('==FILTER==');
            console.dir(ast, { depth:  null });

            let filter = ast.filter.filter();
            let filteredTabs = tabs.filter(tab => filter(tab, context));

            ast.execute(filteredTabs);

            return filteredTabs;
        }
    }
} 

// TODO: Is this ok?
export { Bart }