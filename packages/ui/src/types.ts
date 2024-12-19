export type CssClasses = string;

export type SvelteEvent<E extends Event = Event, T extends EventTarget = Element> = E & { currentTarget: EventTarget & T };

export type GenericResult = {
    success: boolean;
    message?: string;
    errorCode?: number;
    data?: Record<string, any>;
}
