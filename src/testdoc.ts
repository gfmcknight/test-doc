namespace TestDocCore {

    const HTML_CHARACTER_SUBSTITUTIONS = new Map([
        ["&", "&amp;"],
        ["<", "&lt;"],
        [">", "&gt;"],
        ["\"", "&quot;"]
    ]);

    const MD_CHARACTER_SUBSTITUTIONS = new Map([
        ["\\", "\\\\"],
        ["`", "\\`"],
        ["*", "\\*"],
        ["_", "\\_"],
        ["{", "\\{"],
        ["}", "\\}"],
        ["[", "\\["],
        ["]", "\\]"],
        ["(", "\\("],
        [")", "\\)"],
        ["#", "\\#"],
        ["+", "\\+"],
        ["-", "\\-"],
        [".", "\\."],
        ["!", "\\!"]
    ]);

    export function escapeHTML(content: string) : string {
        HTML_CHARACTER_SUBSTITUTIONS.forEach((v, k) => {
            content = content.replaceAll(k, v);
        });
        return content;
    }

    export function escapeMarkdown(content: string): string {
        MD_CHARACTER_SUBSTITUTIONS.forEach((v, k) => {
            content = content.replaceAll(k, v);
        });
        return content;
    }

    export type StringLiteral<S> = S extends string ? string extends S ? never : S : never;

    export class TextContentSection {
        text: string = "";
        italic: boolean = false;
        bold: boolean = false;
        preformatted: boolean = false;
        strikethrough: boolean = false;
        link: boolean = false;

        constructor(text: string, italic: boolean, bold: boolean, preformatted: boolean, strikethrough: boolean) {
            this.text = text;
            this.italic = italic;
            this.bold = bold;
            this.preformatted = preformatted;
            this.strikethrough = strikethrough;
        }

        getHTML(): string {
            let value = escapeHTML(this.text);

            if (this.preformatted) {
                value = `<span class="testdoc-preformatted">${value}</span>`;
            }

            if (this.italic) {
                value = `<i>${value}</i>`;
            }

            if (this.bold) {
                value = `<b>${value}</b>`;
            }

            if (this.strikethrough) {
                value = `<s>${value}</s>`;
            }

            return value;
        }

        getMarkdown(): string {
            let value = this.preformatted ? this.text : escapeMarkdown(this.text);

            if (this.preformatted) {
                value = `\`${value}\``;
            }

            if (this.italic) {
                value = `_${value}_`;
            }

            if (this.bold) {
                value = `**${value}**`;
            }

            if (this.strikethrough) {
                value = `~~${value}~~`;
            }

            return value;
        }
    }

    export class TextContentList {
        sections: TextContentSection[] = [];

        addSection(section: TextContentSection) {
            this.sections.push(section);
        }

        text(text: string): TextContentList {
            this.addSection(new TextContentSection(text, false, false, false, false));
            return this;
        }

        italic(text: string): TextContentList {
            this.addSection(new TextContentSection(text, true, false, false, false));
            return this;
        }

        bold(text: string): TextContentList {
            this.addSection(new TextContentSection(text, false, true, false, false));
            return this;
        }

        preformatted(text: string): TextContentList {
            this.addSection(new TextContentSection(text, false, false, true, false));
            return this;
        }

        strikethrough(text: string): TextContentList {
            this.addSection(new TextContentSection(text, false, false, false, true));
            return this;
        }

        getHTML(): string {
            return this.sections.map(section => section.getHTML().trim()).join(" ");
        }

        getMarkdown(): string {
            return this.sections.map(section => section.getMarkdown().trim()).join(" ");
        }
    }

    export class TestDocRendererImpl implements TestDoc.TestDocRenderer {
        private _tabs: number = 0;
        private tabSize: number;
        private hasPaddedLine: boolean;
        content: string;
        root: TestDoc.TestDocElement;

        constructor(root: TestDoc.TestDocElement, tabSize = 2) {
            this.content = "";
            this.tabSize = tabSize;
            this.root = root;
        }

        get tabs(): any {
            return this._tabs;
        }
        
        tabIn() {
            this._tabs += this.tabSize;
        }
        
        tabOut() {
            this._tabs -= this.tabSize;
        }

        setTabCount(tabs: number) {
            this._tabs = this.tabSize * tabs;
        }

        padLine() {
            if (this.hasPaddedLine) {
                return;
            }

            for (let i = 0; i < this.tabs; i++) {
                this.content += " ";
            }
        }

        renderEmptySpace(amount: number) {
            let previousEmptySpace = 0;
            for (let i = this.content.length - 1; i >= 0; i--) {
                if (this.content[i] == "\n") {
                    previousEmptySpace++;
                } else {
                    break;
                }
            }
            for (let i = 0; i < amount - previousEmptySpace; i++) {
                this.content += "\n";
            }
            this.hasPaddedLine = false;
        }

        renderLine(content: string) {
            if (!this.content.endsWith("\n")) {
                this.content += "\n";
                this.hasPaddedLine = false;
            }

            this.padLine();

            this.content += content;
        }

        renderAppend(content: string) {
            this.padLine();
            this.content += content;
        }

        crawl(callback: (depth: number, element: Readonly<TestDoc.TestDocElement>) => void) {
            let elementStack = [ { element: this.root, depth: 0} ];
            while (elementStack.length > 0) {
                const { element, depth } = elementStack.shift();
                if (typeof (element as TestDoc.TestDocContainer).getElements === "function") {
                    elementStack.unshift(...(element as TestDoc.TestDocContainer).getElements().map(element => ({element, depth: depth + 1})));
                }
                callback(depth, element);
            }
        }

        getContent(): string {
            return this.content;
        }
    }

    export type TestDocElementConstructor<
        TElement extends TestDoc.TestDocElement,
        ArgumentTypes extends unknown[]> =
    {
        new(...args: ArgumentTypes): TElement;
    }

    export class ContextBase {
        private _container: TestDoc.TestDocContainer;
        private tentativeElements: TestDoc.TestDocElement[] = [];
        private disposed: boolean = false;
        private contextFactory: (base: ContextBase) => any;

        constructor(container: TestDoc.TestDocContainer, factory: (base: ContextBase) => any) {
            this._container = container;
            this.contextFactory = factory;
        }

        element(elem: TestDoc.TestDocElement) {
            this.tentativeElements.push(elem);
            return elem;
        }

        async container(container: TestDoc.TestDocContainer,
            callbackOrList: CallbackOrListType<any>)
        {
            if (callbackOrList instanceof Array) {
                for (let elem of callbackOrList) {
                    let index = this.tentativeElements.indexOf(elem);
                    if (index != -1) {
                        this.tentativeElements.splice(index, 1);
                    }
                    container.addElement(elem);
                }

                return container;
            }

            let newContextBase = new ContextBase(container, this.contextFactory);
            await Promise.resolve(callbackOrList(this.contextFactory(newContextBase)));
            newContextBase.dispose();
            return container;
        }

        dispose() {
            if (this.disposed) {
                return;
            }

            for (let elem of this.tentativeElements) {
                this._container.addElement(elem);
            }
            this.disposed = true;
        }
    }

    export const startingContextFactory = (base: ContextBase) => ({});

    type WithElement<
        Name extends string,
        ArgumentTypes extends unknown[],
        TElement extends TestDoc.TestDocElement> =
    {
        [key in Name]: (...args: ArgumentTypes) => TElement;
    };

    export function extendWithElement<
        Name extends string,
        TCons extends TestDocElementConstructor<TElement, ArgumentTypes>,
        ArgumentTypes extends unknown[],
        TElement extends TestDoc.TestDocElement,
        TContext
    > (name: Name, cons: TCons, contextCons: (base: ContextBase) => TContext):
        (base: ContextBase) => (WithElement<StringLiteral<Name>, ConstructorParameters<TCons>, InstanceType<TCons>> & TContext) {
        return (base: ContextBase) => ({
            [name]: (...args: ArgumentTypes) => {
                const newElement = new cons(...args);
                base.element(newElement);
                return newElement;
            },
            ...contextCons(base)
        }) as any;
    }

    export type CallbackOrListType<TContext> = ((context: TContext) => Promise<void>) | ((context: TContext) => void) | TestDoc.TestDocElement[];

    type WithContainer<
        Name extends string,
        ArgumentTypes extends unknown[],
        TContainer extends TestDoc.TestDocContainer> =
    {
        [key in Name]: (
            ...args: [
                ...ArgumentTypes,
                CallbackOrListType<any>
            ]
        ) => Promise<TContainer>;
    };

    export function extendWithContainer<
        Name extends string,
        TCons extends TestDocElementConstructor<TContainer, ArgumentTypes>,
        ArgumentTypes extends unknown[],
        TContainer extends TestDoc.TestDocContainer,
        TContext
    > (name: Name, cons: TCons, contextCons: (base: ContextBase) => TContext):
        (base: ContextBase) => (WithContainer<StringLiteral<Name>, ConstructorParameters<TCons>, InstanceType<TCons>> & TContext) {
        return (base: ContextBase) => ({
            [name]: async (...args: [...ArgumentTypes, CallbackOrListType<any>]) => {
                const newElement = new cons(...(args.slice(0, args.length - 1) as ArgumentTypes));
                await base.element(newElement);
                await base.container(newElement, args[args.length - 1] as CallbackOrListType<any>);
                return newElement;
            },
            ...contextCons(base)
        }) as any;
    }

    type ProbablyContext = {
        [key: string]: 
            ((...args: [...unknown[], CallbackOrListType<any>]) => Promise<TestDoc.TestDocContainer>) |
            ((...args: unknown[]) => TestDoc.TestDocElement)
    };

    type Head<T extends unknown[]> = T extends [...infer H, any] ? H : never;

    export type WithCorrectCallbackContextType<TContext extends ProbablyContext> =
    {
        [key in keyof TContext]: ReturnType<TContext[key]> extends TestDoc.TestDocContainer ?
            (...args: [...Head<Parameters<TContext[key]>>, CallbackOrListType<WithCorrectCallbackContextType<TContext>>]) => ReturnType<TContext[key]>:
            TContext[key]
    }
}

namespace TestDoc {
    export interface TestDocRenderer {
        get tabs();
        tabIn();
        tabOut();
        setTabCount(tabs: number);
        renderEmptySpace(amount: number);
        renderLine(content: string);
        renderAppend(content: string);
        crawl(callback: (depth: number, element: Readonly<TestDoc.TestDocElement>) => void);

        getContent(): string;
    }

    export interface TestDocElement {
        renderAsHTML(depth: number, renderer: TestDocRenderer): void;
        renderAsMarkdown(depth: number, renderer: TestDocRenderer): void;
    }

    export interface TestDocContainer extends TestDocElement {
        addElement(elem: TestDocElement): void;
        getElements(): TestDocElement[];
    }

    export class TestDocText extends TestDocCore.TextContentList implements TestDocElement {
        constructor(text?: string) {
            super();
            if (text != undefined) {
                this.text(text);
            }
        }

        renderAsHTML(depth: number, renderer: TestDocRenderer): void {
            renderer.renderLine(this.getHTML());
        }

        renderAsMarkdown(depth: number, renderer: TestDocRenderer): void {
            renderer.renderEmptySpace(2);
            renderer.renderLine(this.getMarkdown());
        }
    }

    export class TestDocNote extends TestDocCore.TextContentList implements TestDocElement {

        constructor(text?: string) {
            super();
            if (text != undefined) {
                this.text(text);
            }
        }

        renderAsHTML(depth: number, renderer: TestDocRenderer): void {
            renderer.renderLine(`<div class="testdoc-note">`);
            renderer.tabIn();
            renderer.renderLine(this.getHTML());
            renderer.tabOut();
            renderer.renderLine(`</div>`);
        }

        renderAsMarkdown(depth: number, renderer: TestDocRenderer): void {
            renderer.renderLine("> ");
            renderer.renderAppend(this.getMarkdown());
        }
    }

    export class TestDocImage implements TestDocElement {
        path: string = ""
        label: string = "";

        constructor(path: string, label: string) {
            this.path = path;
            this.label = label;
        }
        renderAsHTML(depth: number, renderer: TestDocRenderer): void {
            const labelEscaped = TestDocCore.escapeHTML(this.label);
            renderer.renderLine(`<figure>`)
            renderer.tabIn();
            renderer.renderLine(`<img alt=${labelEscaped} src="${this.path}"/>`);
            renderer.renderLine(`<figcaption>${labelEscaped}</figcaption>`);
            renderer.tabOut();
            renderer.renderLine(`</figure>`)
        }
        renderAsMarkdown(depth: number, renderer: TestDocRenderer): void {
            const labelEscaped = TestDocCore.escapeMarkdown(this.label);
            renderer.renderLine(`![${labelEscaped}](${this.path})`);
            renderer.renderLine(`> ${labelEscaped}`);
        }
    }

    export class TestDocPreformattedBlock implements TestDocElement {
        lines: string[];
        languageHint?: string;

        constructor(text: string, languageHint?: string) {
            this.lines = text.split("\n");
            this.languageHint = languageHint;
        }

        renderAsHTML(depth: number, renderer: TestDocRenderer): void {
            throw new Error("Method not implemented.");
        }

        renderAsMarkdown(depth: number, renderer: TestDocRenderer): void {
            renderer.renderLine("```");
            if (this.languageHint) {
                renderer.renderAppend(this.languageHint);
            }
            let emptySpace = 0;
            for (let line of this.lines) {
                if (line.length == 0) {
                    emptySpace++;
                } else {
                    renderer.renderEmptySpace(emptySpace);
                    emptySpace = 1;
                    renderer.renderLine(line);
                }
            }
            renderer.renderLine("```");
        }
    }

    export class TestDocSection implements TestDocContainer {
        title: string = "";
        content: TestDocElement[] = [];

        constructor(title: string) {
            this.title = title;
        }

        addElement(elem: TestDocElement): void {
            this.content.push(elem);
        }

        getElements(): TestDocElement[] {
            return this.content;
        }

        renderAsHTML(depth: number, renderer: TestDocRenderer): void {
            const size = Math.min(6, depth + 1);
            renderer.renderLine(`<h${size}>${TestDocCore.escapeHTML(this.title)}</h${size}>`);
            this.content.forEach(elem => {
                elem.renderAsHTML(depth + 1, renderer);
            });
        }

        renderAsMarkdown(depth: number, renderer: TestDocRenderer): void {
            const size = Math.min(6, depth + 1);

            let poundSymbols = "";
            for (var i = 0; i < size; i++) {
                poundSymbols += "#";
            }

            renderer.renderLine(`${poundSymbols} ${TestDocCore.escapeMarkdown(this.title)}`);
            this.content.forEach(elem => {
                elem.renderAsMarkdown(depth + 1, renderer);
            });
        }
    }

    export class TestDocContents implements TestDocElement {
        renderAsHTML(depth: number, renderer: TestDocRenderer): void {
            throw new Error("Method not implemented.");
        }
        renderAsMarkdown(depth: number, renderer: TestDocRenderer): void {
            const originalTabs = renderer.tabs;
            renderer.crawl((depth, element) => {
                if (element instanceof TestDocSection) {
                    renderer.setTabCount(depth - 1);
                    const sectionID = element.title
                        .toLowerCase()
                        .replaceAll(",", "")
                        .replaceAll(".", "")
                        .replaceAll(" ", "-");
                    renderer.renderLine(`- [${element.title}](#${sectionID})`);
                }
            });
            renderer.setTabCount(originalTabs);
        }
    }

    export class TestDocDocument<TContext> implements TestDocContainer {
        content: TestDocElement[] = [];
        private contextBase: TestDocCore.ContextBase;
        private contextFactory: (base: TestDocCore.ContextBase) => TContext;

        constructor(contextFactory: (base: TestDocCore.ContextBase) => TContext) {
            this.contextFactory = contextFactory;
            this.contextBase = new TestDocCore.ContextBase(this, contextFactory);
        }

        useElement<
            Name extends string,
            TCons extends TestDocCore.TestDocElementConstructor<TElement, ArgumentTypes>,
            ArgumentTypes extends unknown[],
            TElement extends TestDocElement,
        > (name: Name, cons: TCons) {
            const newFactory = TestDocCore.extendWithElement(name, cons, this.contextFactory as (base: TestDocCore.ContextBase) => TContext);
            this.contextFactory = newFactory;
            this.contextBase = new TestDocCore.ContextBase(this, newFactory);
            type contextType = ReturnType<typeof newFactory>;
            type fixedContextType = TestDocCore.WithCorrectCallbackContextType<contextType>;
            return this as unknown as TestDocDocument<fixedContextType>;
        }

        useContainer<
            Name extends string,
            TCons extends TestDocCore.TestDocElementConstructor<TElement, ArgumentTypes>,
            ArgumentTypes extends unknown[],
            TElement extends TestDocContainer,
        > (name: Name, cons: TCons) {
            const newFactory = TestDocCore.extendWithContainer(name, cons, this.contextFactory as (base: TestDocCore.ContextBase) => TContext);
            this.contextFactory = newFactory;
            this.contextBase = new TestDocCore.ContextBase(this, newFactory);
            type contextType = ReturnType<typeof newFactory>;
            type fixedContextType = TestDocCore.WithCorrectCallbackContextType<contextType>;
            return this as unknown as TestDocDocument<fixedContextType>;
        }

        async body(callbackOrList: TestDocCore.CallbackOrListType<TContext>): Promise<void>{
            await this.contextBase.container(this, callbackOrList);
        }

        addElement(elem: TestDocElement): void {
            this.content.push(elem)
        }

        getElements(): TestDocElement[] {
            return this.content;
        }

        renderAsHTML(depth: number, renderer: TestDocRenderer): void {
            renderer.renderLine(`<html>`);
            renderer.tabIn();
            this.content.forEach(elem => {
                elem.renderAsHTML(depth, renderer);
            });
            renderer.tabOut();
            renderer.renderLine(`</html>`);
        }

        renderAsMarkdown(depth: number, renderer: TestDocRenderer): void {
            this.content.forEach(elem => {
                elem.renderAsMarkdown(depth, renderer);
            });
        }
    }

    export function document() {
        return new TestDocDocument<{}>(TestDocCore.startingContextFactory)
            .useElement("text", TestDocText)
            .useElement("note", TestDocNote)
            .useElement("image", TestDocImage)
            .useElement("sample", TestDocPreformattedBlock)
            .useElement("contents", TestDocContents)
            .useContainer("section", TestDocSection);
    }

    export type DocumentType = "html" | "md";
    export function render(doc: TestDocElement, documentType: DocumentType = "html", tabsize = 2): string {
        const renderer = new TestDocCore.TestDocRendererImpl(doc, tabsize);
        switch (documentType) {
            case "html":
                doc.renderAsHTML(0, renderer);
                break;
            case "md":
                doc.renderAsMarkdown(0, renderer);
                break;
        }
        return renderer.getContent();
    }

     
}

export type ContextOf<T> = T extends TestDoc.TestDocDocument<infer TContext> ? TContext : never;
export { TestDoc };