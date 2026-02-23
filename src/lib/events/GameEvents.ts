export class GameEvents {
    private onLoadedCallbacks: (() => void)[] = [];

    public onLoaded(callback: () => void) {
        this.onLoadedCallbacks.push(callback);
    }

    public emitLoaded() {
        this.onLoadedCallbacks.forEach(cb => cb());
    }

    public clear() {
        this.onLoadedCallbacks = [];
    }
}
