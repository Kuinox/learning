import OpenSimplexNoise from 'open-simplex-noise';
import {
    Engine,
    Scene,
    FreeCamera,
    AbstractMesh,
    Mesh, Vector3, PointLight, StandardMaterial, Texture, CubeTexture, CannonJSPlugin, PhysicsImpostor, PointerEventTypes, VertexData, Color3, RawTexture, DynamicTexture, Material, CSG, AmmoJSPlugin, SimplificationSettings, SimplificationType
} from "babylonjs";
import seedrandom from "seedrandom";
export class Interactions {
    public engine: Engine;
    public scene: Scene;
    public camera: FreeCamera;
    public ball: Mesh;
    public ground: Mesh;
    private random: seedrandom.prng;
    private hole: Mesh;
    private texture: DynamicTexture;
    private gndMat: StandardMaterial;
    private count:number;
    /**
     * Constructor.
     * @param _canvas the canvas where to draw the scene
     */
    public constructor(private _canvas: HTMLCanvasElement) {
        this.random = seedrandom("41444664565462");
        this.random();
        this._init();
        this.scene.enablePhysics(new Vector3(0, -9.81, 0), new AmmoJSPlugin());
        this._initLights();
        this._initGeometries();
        this._initPhysics();
        this._initInteractions();
    }
    /**
     * Runs the interactions game.
     */
    public run(): void {
        this.engine.runRenderLoop(() => {
            if(this.ball.position.y < 0 ) {
                this._initHeightMap(this.random());
                this._initBall();
                console.log("reinit");
            }
            this.scene.render();
        });
    }

    /**
     * Inits the interactions.
     */
    private _init(): void {
        this.engine = new Engine(this._canvas);
        this.scene = new Scene(this.engine);
        this.camera = new FreeCamera('freeCamera', new Vector3(15, 500, 15), this.scene);
        this.camera.attachControl(this._canvas);
    }

    private _initLights(): void {
        const light = new PointLight('pointLight', new Vector3(15, 300, 15), this.scene);
    }

    private _initBall(): void {
        if(this.ball != null) this.ball.dispose();
        this.ball = Mesh.CreateSphere('box', 0, 2.5, this.scene);
        this.ball.position.y = 300;
        this.ball.isPickable = true;
        const std = new StandardMaterial('std', this.scene);
        std.diffuseTexture = new Texture('../assets/maki.jpg', this.scene);
        this.ball.material = std;
        this.ball.physicsImpostor = new PhysicsImpostor(this.ball, PhysicsImpostor.SphereImpostor, {
            mass: 10,
            restitution: 0.2,
            friction: 0.5
        });
    }
    private _initGeometries(): void {
        this._initHeightMap(this.random());
        this._initBall();
        
        const skybox = Mesh.CreatePolyhedron('skybox', { type: 0, size: 5000 }, this.scene);
        const skyboxMaterial = new StandardMaterial('skybox', this.scene);
        skyboxMaterial.disableLighting = true;
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new CubeTexture('../assets/TropicalSunnyDay', this.scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = Texture.SKYBOX_MODE;
        skybox.material = skyboxMaterial;
        skybox.infiniteDistance = true;
    }


    private _initHeightMap(seed: number): void {
        alert("You won in "+count+" move.");
        this.count = 0;
        if(this.ground != null) this.ground.dispose();
        const mesh = Mesh.CreateGround('ground', 500, 500, 10, this.scene, true).convertToFlatShadedMesh();
        const noise = new OpenSimplexNoise(Math.pow(5,seed));
        console.log("seed:"+seed + " noise:"+noise.noise2D(0,0));
        const heightMapSize = 250;
        const heightMapHeight = heightMapSize;
        const heightMapWidth = heightMapSize;
        const heightMap: Uint8Array = new Uint8Array(heightMapHeight * heightMapWidth * 4);
        const ratioFrequency = 5;
        const frequency = ratioFrequency / heightMapHeight;
        const redistribution = 1;

        this.texture = new DynamicTexture('perlinTexture', heightMapSize, this.scene, true);
        const ctx = this.texture.getContext();
        const imgData = ctx.getImageData(0, 0, heightMapSize, heightMapSize);
        for (let x = 0; x < heightMapWidth; x++) {
            for (let y = 0; y < heightMapHeight; y++) {
                let noiseValue = ((noise.noise2D(x * frequency, y * frequency) + 1) * 125);
                noiseValue = Math.pow(noiseValue, redistribution);
                const arrayPos = (x + y * heightMapWidth) * 4;
                heightMap[arrayPos + 0] = noiseValue;
                heightMap[arrayPos + 1] = noiseValue;
                heightMap[arrayPos + 2] = noiseValue;
                heightMap[arrayPos + 3] = 0;

                imgData.data[arrayPos + 0] = 125;
                imgData.data[arrayPos + 1] = 125 + (noiseValue / 2);
                imgData.data[arrayPos + 2] = 125;
                imgData.data[arrayPos + 3] = 255;

            }
        }
        ctx.putImageData(imgData, 0, 0);
        this.texture.update();
        this.gndMat = new StandardMaterial('gndMat', this.scene);
        this.gndMat.diffuseTexture = this.texture;
        // this.gndMat.wireframe = true;
        mesh.material = this.gndMat;
        mesh.occlusionType = AbstractMesh.OCCLUSION_TYPE_NONE;
        const vertexData = VertexData.CreateGroundFromHeightMap({
            width: 500,
            height: 500,
            buffer: heightMap,
            subdivisions: 20,
            bufferHeight: heightMapSize,
            bufferWidth: heightMapSize,
            maxHeight: 50,
            minHeight: 0,
            alphaFilter: 0,
            colorFilter: Color3.Gray()
        });
        vertexData.updateMesh(mesh);
        this.hole = Mesh.CreateCylinder('ball_hole', 1000, 5, 60, 0, 1, this.scene);
        this.hole.position.y = 0;
        this.hole.position.x = this.random() * 400 - 200;
        this.hole.position.z = this.random() * 400 -200;
        this.hole.setEnabled(false);
        const holeCsg = CSG.FromMesh(this.hole);
        const groundCsg = CSG.FromMesh(mesh);
        groundCsg.subtractInPlace(holeCsg);

        this.ground = groundCsg.toMesh('ground', this.gndMat, this.scene, true);
        this.ground.freezeNormals();
        this.ground.freezeWorldMatrix();
        this.ground.refreshBoundingInfo(true);
        mesh.dispose();
        this.camera.setTarget(this.ground.position);
    }

    private _initPhysics(): void {

        this.ground.physicsImpostor = new PhysicsImpostor(this.ground, PhysicsImpostor.MeshImpostor, {
            mass: 0,
            restitution: 0.4,
            friction: 0.5
        });

        
    }

    private _initInteractions(): void {
        this.scene.onPointerObservable.add((data) => {
            if (data.type !== PointerEventTypes.POINTERUP)
                return;

            if (data.pickInfo.pickedMesh === this.ball) {
                this.count++;
                this.ball.applyImpulse(data.pickInfo.ray.direction.multiplyByFloats(100, 100, 100), data.pickInfo.pickedPoint);
            }
        });
    }
}
