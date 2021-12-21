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
    interface TestDocElement {
        render(depth: number, renderer: TestDocCore.TestDocRenderer): void;
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

    export class TestDocDocument implements TestDocContainer {
        content: TestDocElement[] = [];
        private mainContext: TestDocContext = new TestDocContext(this);

        getContext(): TestDocContext {
            return this.mainContext;
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

    export class TestDocContext {
        private container: TestDocContainer;
        // The context needs 
        private tentativeElements: TestDocElement[] = [];
        private disposed: boolean = false;

        constructor(container: TestDocContainer) {
            this.container = container;
        }

        text(text: string): TestDocText {
            let newElement = new TestDocText(text);
            this.tentativeElements.push(newElement);
            return newElement;
        }

        note(text: string): TestDocNote {
            let newElement = new TestDocNote(text);
            this.tentativeElements.push(newElement);
            return newElement;
        }

        image(path: string, label: string) {
            let newElement = new TestDocImage(path, label);
            this.tentativeElements.push(newElement);
            return newElement;
        }

        section(title: string, 
            callbackOrList: ((context: TestDocContext) => Promise<void>) |
                            ((context: TestDocContext) => void) |
                            TestDocElement[]): TestDocSection |
                            TestDocElement[]
        {
            let newElement = new TestDocSection(title);

            if (callbackOrList instanceof Array) {
                for (let elem of callbackOrList) {
                    let index = this.tentativeElements.indexOf(elem);
                    if (index != -1) {
                        this.tentativeElements.splice(index, 1);
                    }
                    newElement.addElement(elem);
                }

                this.tentativeElements.push(newElement);
                return newElement;
            }

            let newContext = new TestDocContext(this.container);
            Promise.resolve(callbackOrList(newContext)).then(() => {
                newContext.dispose();
            });
            this.tentativeElements.push(newElement);
            return newElement;
        }

        dispose() {
            if (this.disposed) {
                return;
            }

            for (let elem of this.tentativeElements) {
                this.container.addElement(elem);
            }
            this.disposed = true;
        }
    }
}

export default TestDoc;