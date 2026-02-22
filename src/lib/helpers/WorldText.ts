import * as THREE from "three";

export class WorldText {
    public sprite: THREE.Sprite;
    private canvas: HTMLCanvasElement;
    private context: CanvasRenderingContext2D;
    private texture: THREE.CanvasTexture;

    private currentDisplayHealth: number = 100;
    private targetHealth: number = 100;
    private lerpSpeed: number = 0.1;

    constructor(text: string, color: string = "white") {
        this.canvas = document.createElement("canvas");
        this.context = this.canvas.getContext("2d")!;
        this.canvas.width = 512;
        this.canvas.height = 128;

        this.texture = new THREE.CanvasTexture(this.canvas);
        const material = new THREE.SpriteMaterial({ map: this.texture });
        this.sprite = new THREE.Sprite(material);
        this.sprite.scale.set(20, 5, 1);

        this.drawUI(text, 100, color);
    }

    public updateUI(text: string, healthPercent: number, color: string = "white") {
        this.targetHealth = healthPercent;

        if (Math.abs(this.currentDisplayHealth - this.targetHealth) > 0.1) {
            this.currentDisplayHealth += (this.targetHealth - this.currentDisplayHealth) * this.lerpSpeed;
        } else {
            this.currentDisplayHealth = this.targetHealth;
        }

        this.drawUI(text, this.currentDisplayHealth, color);
    }

    private drawUI(text: string, healthPercent: number, color: string = "white") {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.context.font = "bold 60px Arial";
        this.context.fillStyle = color;
        this.context.textAlign = "center";
        this.context.textBaseline = "middle";
        this.context.fillText(text, this.canvas.width / 2, 45);

        const barWidth = 300;
        const barHeight = 20;
        const barX = (this.canvas.width - barWidth) / 2;
        const barY = 90;

        this.context.fillStyle = "#333333";
        this.context.fillRect(barX, barY, barWidth, barHeight);

        const healthColor = healthPercent > 50 ? "#00ff00" : healthPercent > 20 ? "#ff8800" : "#ff0000";
        this.context.fillStyle = healthColor;
        this.context.fillRect(barX, barY, barWidth * (Math.max(0, healthPercent) / 100), barHeight);

        this.texture.needsUpdate = true;
    }
}
