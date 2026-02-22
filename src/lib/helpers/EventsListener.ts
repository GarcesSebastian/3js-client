import { Render3JS } from "../render";

export class EventsListener {
    constructor(render: Render3JS) {
        this.addEventListeners(render);
    }

    private addEventListeners(render: Render3JS) {
        window.addEventListener("resize", this.onWindowResize.bind(this, render));
    }

    private onWindowResize(render: Render3JS) {
        render.width = window.innerWidth;
        render.height = window.innerHeight;
        render.camera.aspect = render.width / render.height;
        render.camera.updateProjectionMatrix();
        render.renderer.setSize(render.width, render.height);
    }
}