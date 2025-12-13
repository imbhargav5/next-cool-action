import type { ReactElement, ReactNode } from "react";

declare global {
    namespace JSX {
        type Element = ReactElement;
        interface ElementClass {
            render(): ReactNode;
        }
    }
}

export { };
