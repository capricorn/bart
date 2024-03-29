import { Bart } from 'src/bart/bart';
import { DummyStorage } from 'tests/util.test';
import { Util } from 'src/bart/util';

export {};

/*
test('Test tokenization of input', () => {
    let results = Bart.Lexer.tokenize('"abc 123"  "xyz"    999  777');
    expect(results).toEqual(['"abc 123"', '"xyz"', '999', '777']);
});

test('Test lexing of input containing strings', () => {
    let results = Bart.Lexer.lex('"xyz" "asdf"');
    expect(results).toEqual([
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"asdf"')
    ]);
});

test('Test lexing of input containing a filter', () => {
    let results = Bart.Lexer.lex('url "xyz"');
    expect(results).toEqual([
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Filter, 'url'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"')
    ]);
});

test('Test lexing of input containing negation', () => {
    let results = Bart.Lexer.lex('url ! "xyz"');
    expect(results).toEqual([
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Filter, 'url'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Negation, '!'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"')
    ]);
});

test('Test lexing of input containing combinator', () => {
    let results = Bart.Lexer.lex('| url & "xyz" "ijk"');
    expect(results).toEqual([
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Combinator, '|'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Filter, 'url'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Combinator, '&'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"ijk"'),
    ]);
});

test('Test consume given a predicate', () => {
    let tokens = [
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"ijk"'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Combinator, '&')
    ];

    let [consumed, remaining] = Bart.Parser.consume(
        tokens,
        (token) => {
            return Bart.Lexer.isString(token.value);
        }
    );

    expect(consumed).toEqual([
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"ijk"'),
    ]);   

    expect(remaining).toEqual([
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Combinator, '&')
    ]);
});

test('Test parse string combinator', () => {
    let tokens = [
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.Combinator, '|'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"xyz"'),
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"ijk"')
    ];

    let [combinator, remainder] = Bart.Parser.parseStringCombinator(tokens);
    expect(remainder.length).toBe(0);
    expect(combinator.combinator).toBe('|');
    expect(combinator.strings).toEqual(['"xyz"', '"ijk"']);
});

test('Implicit "&" StringCombinator when parsing single string', () => {
    let tokens = [
        new Bart.Lexer.Token(0, 0, Bart.Lexer.TokenType.StringArg, '"ijk"')
    ];

    let [combinator, remainder] = Bart.Parser.parseStringCombinator(tokens);
    expect(combinator.combinator).toBe('&');
    expect(combinator.strings).toEqual(['"ijk"']);
});

test('Consume complex string combinator', () => {
    let query = '"abc" ! "xyz" | "ijk" "ooo"'
    let lex = Bart.Lexer.lex(query);

    let [combinator, remainder] = Bart.Parser.consumeStringCombinator(lex);
    expect(combinator.combinator).toBe('&');
    expect(combinator.strings).toEqual(['"abc"']);
    // A child for negation and a child for the nested OR
    expect(combinator.children.length).toBe(2);
    expect(combinator.children[0].combinator).toBe('!');

    let nestedCombinator = combinator.children[1];
    expect(nestedCombinator.combinator).toBe('|');
    expect(nestedCombinator.strings).toEqual(['"ijk"', '"ooo"']);
});

test('Consume filter test', () => {
    let query = 'title | "xyz" "ijk"';
    let lex = Bart.Lexer.lex(query);

    let [filterCombinator, remainder ] = Bart.Parser.consumeFilterCombinator(lex);

    expect(filterCombinator.combinator).toBe('&');
    expect(filterCombinator.filters.length).toBe(1);

    let filter = filterCombinator.filters[0];
    let filterArg = filter.arg;

    expect(filter.type).toBe('title');
    expect(filterArg.combinator).toBe('|');
    expect(filterArg.strings).toEqual(['"xyz"', '"ijk"']);
});

test('Consume compound filter test', () => {
    let query = '| title "xyz" url "abc"'
    let lex = Bart.Lexer.lex(query);

    let [filterCombinator, _] = Bart.Parser.consumeFilterCombinator(lex);

    expect(filterCombinator.combinator).toBe('|');
    expect(filterCombinator.filters[0].type).toBe('title');
    expect(filterCombinator.filters[1].type).toBe('url');
    expect(filterCombinator.filters[0].arg.strings).toEqual(['"xyz"']);
    expect(filterCombinator.filters[1].arg.strings).toEqual(['"abc"']);
});

test('Prettyprint string combinator', () => {
    let lex = Bart.Lexer.lex('& "xyz" ! "ijk"');
    let [stringCombinator, _] = Bart.Parser.consumeStringCombinator(lex)
    //let [filterCombinator, _] = Bart.Parser.consumeFilterCombinator(lex);

    console.log(stringCombinator.print());
    //expect(stringCombinator.print).toBe();
    //console.log(filterCombinator);
});

test('prettyprint filter', () => {
    let lex = Bart.Lexer.lex('url "xyz" "ijk"');

    let [filterCombinator, _] = Bart.Parser.consumeFilterCombinator(lex)

    expect(filterCombinator.filters.length == 1);
    console.log(filterCombinator.filters[0].print());
});

test('prettyprint filter combinator', () => {
    let query = '| title "xyz" url "abc"';
    let lex = Bart.Lexer.lex(query);

    let [filterCombinator, _] = Bart.Parser.consumeFilterCombinator(lex);

    console.log(filterCombinator.print());
});

test('Test StringCombinator filter', () => {
    let query = '| "xyz" ! "abc"';
    let lex = Bart.Lexer.lex(query);

    let [stringCombinator, _] = Bart.Parser.consumeStringCombinator(lex);

    let filter: Bart.StringFilter = stringCombinator.filter();

    expect(stringCombinator.combinator == '|');
    expect(filter('"xyz"')).toBe(true);
    expect(filter('"ijk"')).toBe(true);
    expect(filter('"abc"')).toBe(false);
});

test('Test Filter filter', () => {
    let query = 'title | "xyz" "abc"';
    let lex = Bart.Lexer.lex(query);
    let context = new Bart.TabContext();

    let [filterCombinator, _] = Bart.Parser.consumeFilterCombinator(lex);
    let filter = filterCombinator.filters[0].filter(context);


    let tabs = [
        new Bart.DummyTab('"xyz"', ''),
        new Bart.DummyTab('"ijk"', '')
    ];

    let results = tabs.filter(t => filter(t, context));
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('"xyz"');
});

test('Test FilterCombinator filter', () => {
    let query = 'url "abc" title "xyz"';
    let lex = Bart.Lexer.lex(query);
    let context = new Bart.TabContext();

    let [filterCombinator, _] = Bart.Parser.consumeFilterCombinator(lex);
    let filter = filterCombinator.filter();

    let tabs = [
        new Bart.DummyTab('"xyz"', '"abc"'),
        new Bart.DummyTab('"ijk"', '')
    ];

    let results = tabs.filter(t => filter(t, context));
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('"xyz"');
    expect(results[0].url).toBe('"abc"');
});

test('Test bart interpreter', () => {
    //let query = '| url ! "xyz" ! "ijk" title "rst"';
    let query = '| url ! "xyz" title "rst"';
    //let query = '| url "xyz" title "rst"';
    let context = new Bart.TabContext();

    let tabs = [
        // title, url
        new Bart.DummyTab('"xyz"', ' '),    // matches
        new Bart.DummyTab('"rst"', ' '),  // matches
        new Bart.DummyTab('"123"', '"xyz"')  // no match
    ];

    let results = Bart.Interpreter.interpret(query, tabs, context);
    expect(results.length).toBe(2);

});

test('Test string negation', () => {
    let query = 'url ! "xyz"';
    let context = new Bart.TabContext();

    let tabs = [
        // title, url
        new Bart.DummyTab('"xyz"', ' '),
        new Bart.DummyTab('', '"xyz"'),
    ];

    //console.log('title: ' + tabs[0]['title']);
    let results = Bart.Interpreter.interpret(query, tabs, context);

    expect(results.length).toBe(1);
});

test('Test parse errors', () => {
    let context = new Bart.TabContext();
    let parseErrors = [
        '"xyz"',    // no filter provided
        'ur',    // incomplete, TODO: Invalid filter
        //'| title "df',   // unterminated string
        //'| title',   // unterminated string
    ];

    for (const error of parseErrors) {
        expect(() => Bart.Parser.parse(error, context)).toThrow(Bart.Parser.ParseError);
    }
});

// TODO: Fix
test('Test match all combinator (empty string program)', () => {
    let tabs = [
        // title, url
        new Bart.DummyTab('"xyz"', ' '),
        new Bart.DummyTab('"rst"', ' '),
        new Bart.DummyTab('"123"', '"xyz"')
    ];

    let context = new Bart.TabContext();
    let ast = Bart.Parser.parse('', context);
    let filter = ast.filter.filter();

    expect(tabs.filter(tab => filter(tab, context)).length).toBe(3);
});

test('Test "curr" filter', () => {
    let context = new Bart.TabContext();

    context.currentWindowId = 70;

    let tabs = [
        new Bart.DummyTab('"xyz"', ' ', 30),
        new Bart.DummyTab('"rst"', ' ', 70),
        new Bart.DummyTab('"abc"', ' ', 70),
    ];

    let filteredTabs = Bart.Interpreter.interpret('curr', tabs, context);
    expect(filteredTabs.length).toBe(2);

    // Compound filter
    filteredTabs = Bart.Interpreter.interpret('title "abc" curr', tabs, context);
    expect(filteredTabs.length).toBe(1);
    expect(filteredTabs[0].title).toBe('"abc"');
});

test('Test $ (selected) tab filter', () => {
    let context = new Bart.TabContext();
    context.selectedTabIds = new Set([2]);

    let tabs = [
        new Bart.DummyTab('"xyz"', ' ', 30, 1),
        new Bart.DummyTab('"rst"', ' ', 70, 2),
        new Bart.DummyTab('"abc"', ' ', 70, 3),
    ];

    let filteredTabs = Bart.Interpreter.interpret('$', tabs, context);

    expect(filteredTabs.length).toBe(1);
    expect(filteredTabs[0].id).toBe(2);
});

test('Test $windowId macro substition', () => {
    let context = new Bart.TabContext();
    context.currentWindowId = 123;

    let tabs = [
        new Bart.DummyTab('"xyz"', ' ', 123, 1),
        new Bart.DummyTab('"rst"', ' ', 70, 2),
    ]

    let filteredTabs = Bart.Interpreter.interpret('windowId $windowId', tabs, context);

    expect(filteredTabs.length).toBe(1);
    expect(filteredTabs[0].windowId).toBe(123);
})
*/

test('Test sort modifier', () => {
    let context = new Bart.TabContext();
    let storage = new DummyStorage();
    let ast = Bart.Parser.parse('sort', context, storage);

    expect(ast.sortModifier.field).toBe('timestamp');

    ast = Bart.Parser.parse('sort ">"', context, storage);
    expect(ast.sortModifier.relation).toBe('>');

    ast = Bart.Parser.parse('sort ">" "url"', context, storage);
    expect(ast.sortModifier.relation).toBe('>');
    expect(ast.sortModifier.field).toBe('url');
});

test('Test explicit group modifier and sort modifier', () => {
    let context = new Bart.TabContext();
    let storage = new DummyStorage();
    let ast = Bart.Parser.parse('sort group "window"', context, storage);

    expect(ast.sortModifier.field).toBe('timestamp');
    expect(ast.groupModifier.modifier).toBe('window');

    ast = Bart.Parser.parse('group "window" sort', context, storage);
    expect(ast.sortModifier.field).toBe('timestamp');
    expect(ast.groupModifier.modifier).toBe('window');
});

test('Test title filter shorthand', async () => {
    let context = new Bart.TabContext();
    let storage = new DummyStorage();

    let tabs = [
        new Bart.DummyTab('"xyz"', ' ', 30, 1),
        new Bart.DummyTab('"rst"', ' ', 70, 2),
        new Bart.DummyTab('"abc"', ' ', 70, 3),
    ];

    let ast = Bart.Parser.parse('t "xyz"', context, storage);
    let filter = ast.filter.filter();
    let results = await Util.asyncFilter((tab: Bart.Tab) => filter(tab, context), tabs);

    expect(results.length).toBe(1);
})