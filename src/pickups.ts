import Phaser from 'phaser';
import type {Combat} from './combat';

// At most one sprite per visible drop. Stable IDs give seeds individual phases
// even when a camera move reassigns their pooled images.
export class PickupSprites {
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private visible = 0;
  constructor(private readonly scene: Phaser.Scene) {}

  draw(sim: Combat, view: Phaser.Geom.Rectangle) {
    const radius2 = sim.pickupRadius ** 2;
    let count = 0;
    for (const d of sim.drops) {
      if (d.x < view.left-36 || d.x > view.right+36 || d.y < view.top-36 || d.y > view.bottom+36) continue;
      const image = this.sprites[count] ?? (this.sprites[count] = this.scene.add.image(0,0,'pickups').setDepth(0));
      count++;
      const berry = d.kind === 'heal';
      const age = Math.max(0, sim.seconds - d.born);
      const arc = Math.min(1, age / .34);
      const dx = sim.player.x - d.x, dy = sim.player.y - d.y;
      const flying = dx*dx + dy*dy < radius2;
      const phase = sim.seconds * (berry ? 2.4 : 3.8) + d.id * 2.4;
      const wave = Math.sin(phase);
      const lift = 4 * arc * (1-arc) * 17 + (1+wave) * (berry ? .6 : 1.8);
      const size = (berry ? 24 : 20) * (.65 + arc*.35);
      image.setVisible(true).setTexture(d.kind==='coin'?'coin':'pickups',d.kind==='coin'?undefined:berry?1:0)
        .setPosition(d.x + (1-arc) * 7 * Math.sin(d.id), d.y - lift)
        .setRotation(flying ? Phaser.Math.Clamp(dx*.005,-.55,.55) : wave*.12)
        .setDisplaySize(size * (d.kind==='coin'?.35+.65*Math.abs(wave):berry ? 1 : .92 + wave*.08),size);
    }
    for (let i=count; i<this.visible; i++) this.sprites[i].setVisible(false);
    this.visible = count;
  }
}
