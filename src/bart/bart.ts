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

// First step: tokenize
namespace Bart {
    export interface Tab {
        title: string
        url: string
        windowId: number
        id: number
    }

    export interface Context {
        currentWindowId: number
        selectedTabIds: Set<number>;
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
    }

    export class TabContext implements Context {
        currentWindowId: number
        selectedTabIds: Set<number>
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

    export type TabFilter = (tab: Tab, context: Context) => boolean;
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
                    case TokenType.Macro:
                        bartClass = "bart-macro";
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
            Macro
        }

        export function isGroupModifier(token: string): boolean {
            return token == "group";
        }

        export function isString(token: string): boolean {
            return token.startsWith('"') && token.endsWith('"');
        }

        export function isMacro(token: string): boolean {
            return token.startsWith('$');
        }

        export function isFilter(token: string): boolean {
            return [ 'title', 'url', 'curr', '$', 'windowId' ].includes(token);
        }

        export function isNegation(token: string): boolean {
            return token == '!';
        }

        export function isCombinator(token: string): boolean {
            return ['|', '&'].includes(token);
        }

        export function isCommand(token: string): boolean {
            return ['.', 'bm'].includes(token);
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
                } else if (Bart.Lexer.isMacro(token.value)) {
                    tokens.push(new Bart.Lexer.Token(token.start, token.end, Bart.Lexer.TokenType.Macro, token.value));
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

            constructor(
                combinator: string,
                strings: Lexer.Token[],
                children: StringCombinator[] = []
            ) {
                super();
                this.combinator = combinator;
                this.strings = strings.map(s => s.value);
                this.children = children;
            }

            print(): string {
                let result = `<span class="bart-combinator">${this.combinator}</span>` +
                    ' ' + '<span class="bart-string">' + this.strings.join(' ') + '</span>'
                    + ' ' + this.children.map(c => c.print()).join(' ');

                return result;
            }

            filter(): StringFilter {
                let stringMatcher: StringFilter = (str: string) => {
                    // **TODO: Handle children as part of matches as well**
                    str = str.toLowerCase();
                    let matches = this.strings.map(s => str.includes(s.toLowerCase().slice(1,-1)))

                    // Negation can _only_ bind to a single string
                    if (this.combinator == '!') {
                        console.log('String combinator negation: ' + this.strings);
                        return !str.includes(this.strings[0].toLowerCase().slice(1,-1));
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

        export class Filter extends PrettyPrint {
            type: string
            arg: StringCombinator

            constructor(
                type: string,
                arg: StringCombinator
            ) {
                super();
                this.type = type;
                this.arg = arg;
            }

            print(): string {
                return `<span class="bart-filter">${this.type}</span>` +
                    ' ' + this.arg.print();
            }

            filter(context: Context): TabFilter {
                // TODO: Reference enum of defined types..? (Somewhat ugly in TS?) 
                switch (this.type) {
                    case 'curr':
                        return (tab: Tab, context: Context) => { return tab.windowId == context.currentWindowId };
                    case '$':
                        return (tab: Tab, context: Context) => { return context.selectedTabIds.has(tab.id) };
                    default:
                        let stringFilter = this.arg.filter();
                        return (tab: Tab, context: Context) => { return stringFilter(tab[this.type]+'') };
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

            constructor(
                combinator: string,
                filters: Filter[],
                child?: FilterCombinator
            ) {
                super();
                this.combinator = combinator;
                this.filters = filters;
                this.child = child;
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
                return (tab: Tab, context: Context) => {
                    // A tab must match all filters
                    let filters = this.filters.map(f => f.filter(context));
                    // TODO: Handle child filter
                    let childResult = this.combinator == '&';   // false for '|' case 
                    if (this.child) {
                        let childFilter = this.child.filter();
                        childResult = childFilter(tab, context);
                    }

                    if (this.combinator == '&') {
                        return filters.map(f => f(tab, context)).every(result => result) && childResult;
                    } else if (this.combinator == '|') {
                        return filters.map(f => f(tab, context)).some(result => result) || childResult;
                    } else {
                        // Interpret error (should be impossible..)
                    }
                }
            }
        }

        export class MatchAllFilterCombinator extends FilterCombinator {
            constructor() {
                super('', []);
            }

            override filter(): TabFilter {
                return (tab) => true;
            }
        }

        export class Command extends Bart.PrettyPrint {
            type: string
            args: StringCombinator | undefined
            filter: FilterCombinator | undefined
            groupModifier: GroupModifier;
            browser: Browser;

            constructor(
                type: string,
                args: StringCombinator | undefined,
                filter: FilterCombinator | undefined,
                groupModifier: GroupModifier = GroupModifier.none,
                browser: Browser = new Browser()
            ) {
                super();
                this.type = type;
                this.args = args;
                this.filter = filter;
                this.groupModifier = groupModifier;
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
                    default: 
                        console.log('Attempting to execute unrecognized command: ' + this.type);
                        break;
                }
            }

            static noop(browser: Browser = new Browser()): Command {
                let filter = new MatchAllFilterCombinator();
                return new Command('.', StringCombinator.emptyCombinator, filter, GroupModifier.none, browser);
            }

            modifier(mod: GroupModifier): Command {
                return new Command(
                    this.type,
                    this.args,
                    this.filter,
                    mod,
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

        export function consumeGroupModifier(tokens: Lexer.Token[]): GroupModifier {
            // The first token will be 'group'
            if (Bart.Lexer.isGroupModifier(tokens[0].value) == false) {
                throw new ParseError();
            }

            tokens = tokens.slice(1);

            if (Bart.Lexer.isString(tokens[0].value) == false || GroupModifier.valid(tokens[0].value.slice(1,-1)) == false) {
                throw new ParseError();
            }

            return new GroupModifier(tokens[0].value.slice(1,-1));
        }

        // TODO
        export function consumeStringNegation(
            tokens: Lexer.Token[]
        ): [result: StringCombinator, remaining: Lexer.Token[]] {
            let negatedString = tokens[1];
            return [new StringCombinator('!', [negatedString], []), tokens.slice(2) ];
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
                } else if (isStringCombinatorSequence(tokens)) {
                    let [childCombinator, remainder] = consumeStringCombinator(tokens);
                    tokens = remainder;
                    combinator.children.push(childCombinator);
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

                    // Consume filter args; loop until all filters are consumed.
                    // Stuck here
                    let [filterArg, remainder] = consumeStringCombinator(tokens);
                    tokens = remainder;
                    console.log('filter remaining tokens: ' + tokens[0]);
                    filters.push(new Filter(filterType, filterArg));
                } else if (isFilterCombinatorSequence(tokens)) {
                    let [filterCombinator, remainder] = consumeFilterCombinator(tokens);
                    filterCombinator.child = filterCombinator;
                    // Should have consumed all tokens here
                    tokens = remainder;
                    break;
                } else if (Bart.Lexer.isGroupModifier(tokens[0].value)) {
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
            }

            return new Lexer.Token(0, 0, Lexer.TokenType.StringArg, substitution);
        }

        export function substituteMacros(tokens: Bart.Lexer.Token[], context: Context): Bart.Lexer.Token[] {
            for (let i = 0; i < tokens.length; i++) {
                if (tokens[i].type == Bart.Lexer.TokenType.Macro) {
                    tokens[i] = substituteMacro(tokens[i].value, context);
                }
            }

            return tokens;
        }

        export function parse(input: string, context: Context): Command {
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

            if (tokens.length > 0) {
                [filterCombinator, tokens] = consumeFilterCombinator(tokens);
            }

            // If there is a group modifier it will remain after all other tokens are parsed.
            if (tokens.length > 0) {
                groupModifier = consumeGroupModifier(tokens);
                console.log('Parsing group modifier');
            }

            return new Command(commandSymbol, commandArgs, filterCombinator, groupModifier);
        }
    }

    export namespace Interpreter {
        export function interpret(input: string, tabs: Tab[], context: Context): Tab[] {
            let ast = Parser.parse(input);
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