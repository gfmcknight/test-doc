namespace TestDocCore {
    export class TextContentSection {
        text: string = "";
        italic: boolean = false;
        bold: boolean = false;
        preformatted: boolean = false;

        constructor(text: string, italic: boolean, bold: boolean, preformatted: boolean) {
            this.text = text;
            this.italic = italic;
            this.bold = bold;
            this.preformatted = preformatted;
        }

        static text(text: string): TextContentSection {
            return new TextContentSection(text, false, false, false);
        }

        static italic(text: string): TextContentSection {
            return new TextContentSection(text, true, false, false);
        }

        static bold(text: string): TextContentSection {
            return new TextContentSection(text, false, true, false);
        }

        static preformatted(text: string): TextContentSection {
            return new TextContentSection(text, false, false, true);
        }
    }

    export class TextContentList {
        sections: TextContentSection[] = [];

        addSection(section: TextContentSection) {
            this.sections.push(section);
        }

        static fromString(text: string): TextContentList {
            // TODO: Convert from markdown string
            let list = new TextContentList();
            list.addSection(TextContentSection.text(text));
            return list;
        }
    }

    export interface TestDocRenderer {
        renderTitle(depth: number, text: string): void;
        renderText(depth: number, text: TextContentList): void;
        renderImage(depth: number, path: string, label: string): void;
        renderNote(depth: number, text: TextContentList): void;

        getContent(): string;
    }

    export class HTMLRenderer implements TestDocRenderer {
        private bodyContent: string;

        constructor() {
            this.bodyContent = "";
        }

        renderTitle(depth: number, text: string): void {
            let size = Math.min(depth, 6);
            this.bodyContent += `<h${size}> ${text} </h${size}>`;
        }

        private getTextElement(text: TextContentList): string {
            let content = "";
            for (let section of text.sections) {
                let sectionContent = section.text;

                if (section.preformatted) {
                    sectionContent = '<span class="testdoc-preformatted">' + sectionContent + '</span>'
                }
                if (section.bold) {
                    sectionContent = "<b>" + sectionContent + "</b>";
                }
                if (section.italic) {
                    sectionContent = "<i>" + sectionContent + "</i>";
                }

                content += sectionContent;
            }
            return content;
        }

        renderText(depth: number, text: TextContentList): void {
            this.bodyContent +=
                `<p>
                    ${this.getTextElement(text)}
                </p>`;
        }
        
        renderImage(depth: number, path: string, label: string): void {
            this.bodyContent += `<img src="${path}" aria-label="${label}"/>`;
        }
        
        renderNote(depth: number, text: TextContentList): void {
            this.bodyContent +=
                `<div class="testdoc-note">
                    ${this.getTextElement(text)}
                </div>`;
        }

        getContent(): string {
            return `<html>
                        <body>
                            ${this.bodyContent};
                        </body>
                    </html>`
        }
    }
}

namespace TestDoc {
    type StringLiteral<S> = S extends string ? string extends S ? never : S : never;

    interface TestDocElement {
        render(depth: number, renderer: TestDocCore.TestDocRenderer): void;
    }

    export interface TestDocElementConstructor<
            ArgumentTypes extends any[],
            TElement extends TestDocElement>
    {
        new(...args: ArgumentTypes): TElement;
    }

    interface TestDocContainer extends TestDocElement {
        addElement(elem: TestDocElement): void;
    }

    class TestDocText implements TestDocElement {
        text: string = "";

        constructor(text: string) {
            this.text = text;
        }

        render(depth: number, renderer: TestDocCore.TestDocRenderer): void {
            renderer.renderText(depth, TestDocCore.TextContentList.fromString(this.text));
        }
    }

    class TestDocNote implements TestDocElement {
        text: string = "";

        constructor(text: string) {
            this.text = text;
        }

        render(depth: number, renderer: TestDocCore.TestDocRenderer): void {
            renderer.renderNote(depth, TestDocCore.TextContentList.fromString(this.text));
        }
    }

    class TestDocImage implements TestDocElement {
        path: string = ""
        label: string = "";

        constructor(path: string, label: string) {
            this.path = path;
            this.label = label;
        }

        render(depth: number, renderer: TestDocCore.TestDocRenderer): void {
            renderer.renderImage(depth, this.path, this.label);
        }
    }

    class TestDocSection implements TestDocContainer {
        title: string = "";
        content: TestDocElement[] = [];

        constructor(title: string) {
            this.title = title;
        }

        render(depth: number, renderer: TestDocCore.TestDocRenderer): void {
            renderer.renderTitle(depth, this.title);
            for (let elem of this.content) {
                elem.render(depth + 1, renderer);
            }
        }

        addElement(elem: TestDocElement): void {
            this.content.push(elem);
        }
    }

    const startingContextFactory = (base: ContextBase) => ({});

    function extendWithElement<
        Name extends string,
        TCons extends TestDocElementConstructor<ArgumentTypes, TElement>,
        ArgumentTypes extends any[],
        TElement extends TestDocElement,
        TContext
    > (name: Name, cons: TCons, contextCons: (base: ContextBase) => TContext):
        (base: ContextBase) => (WithKey<StringLiteral<Name>, ArgumentTypes, TElement> & TContext) {
        return (base: ContextBase) => ({
            [name]: (args: ArgumentTypes) => {
                const newElement = new cons(...args);
                base.element(newElement);
                return newElement;
            },
            ...contextCons(base)
        }) as any;
    }

    const basic = extendWithElement("text", TestDocText, startingContextFactory);

    export class TestDocDocument<TContext> implements TestDocContainer {
        content: TestDocElement[] = [];
        private mainContext: any;
        private contextFactory: any;

        private constructor() {
            this.contextFactory = startingContextFactory;
        }

        static get() {
            const res = new TestDocDocument<ReturnType<typeof startingContextFactory>>()
                .useElement("text", TestDocText);
            res.getContext()
        }

        useElement<
            Name extends string,
            TCons extends TestDocElementConstructor<ArgumentTypes, TElement>,
            ArgumentTypes extends any[],
            TElement extends TestDocElement,
        > (name: Name, cons: TCons) {
            const newFactory = extendWithElement(name, cons, this.contextFactory as (base: ContextBase) => TContext);
            this.contextFactory = newFactory;
            return this as TestDocDocument<ReturnType<typeof newFactory>>;
        }

        getContext(): TContext {
            return this.mainContext = this.contextFactory();
        }

        addElement(elem: TestDocElement): void {
            this.content.push(elem)
        }

        render(depth: number, renderer: TestDocCore.TestDocRenderer): void {
            for (let elem of this.content) {
                elem.render(depth + 1, renderer);
            }
        }

        renderAsHTML(): string {
            this.mainContext.dispose();
            let renderer = new TestDocCore.HTMLRenderer();
            this.render(0, renderer);
            return renderer.getContent();
        }
    }

    export class ContextBase {
        private _container: TestDocContainer;
        private tentativeElements: TestDocElement[] = [];
        private disposed: boolean = false;

        constructor(container: TestDocContainer) {
            this._container = container;
        }

        element(elem: TestDocElement) {
            this.tentativeElements.push(elem);
            return elem;
        }

        async container(c: TestDocContainer,
            callbackOrList: ((context: any) => Promise<void>) |
                            ((context: any) => void) |
                            TestDocElement[])
        {
            this.tentativeElements.push(c);

            if (callbackOrList instanceof Array) {
                for (let elem of callbackOrList) {
                    let index = this.tentativeElements.indexOf(elem);
                    if (index != -1) {
                        this.tentativeElements.splice(index, 1);
                    }
                    c.addElement(elem);
                }

                return c;
            }

            let newContext = new ContextBase(c);
            await Promise.resolve(callbackOrList(newContext));
            newContext.dispose();
            return c;
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

    type WithKey<
        Name extends string,
        ArgumentTypes extends any[],
        TElement extends TestDocElement> =
    {
        [key in Name]: (...args: ArgumentTypes) => TElement;
    };

    function tryStuff() {
        const thing = basic(new ContextBase(undefined as any));
    }
}

export default TestDoc;