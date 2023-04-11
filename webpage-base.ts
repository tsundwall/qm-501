export abstract class WebpageBase {

    protected build_batch(iter:number) {}

    public abstract testing(iter:number): Promise<number[]>
}