/////camera and cookie code



var camera = undefined,
            scene = undefined,
            renderer = undefined,
            light = undefined,
            maze = undefined,
            mazeMesh = undefined,
            mazeDimension = 11,
            planeMesh = undefined,
            ballMesh = undefined,
            ballRadius = 0.25,
            keyAxis = [0, 0],
            ironTexture = THREE.ImageUtils.loadTexture('https://raw.githubusercontent.com/Arnavjain1009/ballroll/main/ball.png'),
            planeTexture = THREE.ImageUtils.loadTexture('https://raw.githubusercontent.com/Arnavjain1009/ballroll/main/concrete.png'),
            brickTexture = THREE.ImageUtils.loadTexture('https://raw.githubusercontent.com/Arnavjain1009/ballroll/main/ball.png'),
            gameState = undefined,
            levelProgress = 0,
            saveProgress = true; // Added variable to control progress saving

        // Box2D shortcuts
        var b2World = Box2D.Dynamics.b2World,
            b2FixtureDef = Box2D.Dynamics.b2FixtureDef,
            b2BodyDef = Box2D.Dynamics.b2BodyDef,
            b2Body = Box2D.Dynamics.b2Body,
            b2CircleShape = Box2D.Collision.Shapes.b2CircleShape,
            b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape,
            b2Settings = Box2D.Common.b2Settings,
            b2Vec2 = Box2D.Common.Math.b2Vec2,

            // Box2D world variables 
            wWorld = undefined,
            wBall = undefined;

        // Function to set cookie
        function setCookie(cname, cvalue, exdays) {
            var d = new Date();
            d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
            var expires = "expires=" + d.toUTCString();
            document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
        }

        // Function to get cookie
        function getCookie(cname) {
            var name = cname + "=";
            var decodedCookie = decodeURIComponent(document.cookie);
            var ca = decodedCookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ') {
                    c = c.substring(1);
                }
                if (c.indexOf(name) == 0) {
                    return c.substring(name.length, c.length);
                }
            }
            return "";
        }

        // Function to check if cookie exists
        function checkCookie() {
            var levelCookie = getCookie("level");
            if (levelCookie != "") {
                mazeDimension = parseInt(levelCookie);
            }
        }

        function createPhysicsWorld() {
            // Create the world object.
            wWorld = new b2World(new b2Vec2(0, 0), true);

            // Create the ball.
            var bodyDef = new b2BodyDef();
            bodyDef.type = b2Body.b2_dynamicBody;
            bodyDef.position.Set(1, 1);
            wBall = wWorld.CreateBody(bodyDef);
            var fixDef = new b2FixtureDef();
            fixDef.density = 1.0;
            fixDef.friction = 0.0;
            fixDef.restitution = 0.25;
            fixDef.shape = new b2CircleShape(ballRadius);
            wBall.CreateFixture(fixDef);

            // Create the maze.
            bodyDef.type = b2Body.b2_staticBody;
            fixDef.shape = new b2PolygonShape();
            fixDef.shape.SetAsBox(0.5, 0.5);
            for (var i = 0; i < maze.dimension; i++) {
                for (var j = 0; j < maze.dimension; j++) {
                    if (maze[i][j]) {
                        bodyDef.position.x = i;
                        bodyDef.position.y = j;
                        wWorld.CreateBody(bodyDef).CreateFixture(fixDef);
                    }
                }
            }
        }


        function generate_maze_mesh(field) {
            var dummy = new THREE.Geometry();
            for (var i = 0; i < field.dimension; i++) {
                for (var j = 0; j < field.dimension; j++) {
                    if (field[i][j]) {
                        var geometry = new THREE.CubeGeometry(1, 1, 1, 1, 1, 1);
                        var mesh_ij = new THREE.Mesh(geometry);
                        mesh_ij.position.x = i;
                        mesh_ij.position.y = j;
                        mesh_ij.position.z = 0.5;
                        THREE.GeometryUtils.merge(dummy, mesh_ij);
                    }
                }
            }
            var material = new THREE.MeshPhongMaterial({ map: brickTexture });
            var mesh = new THREE.Mesh(dummy, material)
            return mesh;
        }


        function createRenderWorld() {

            // Create the scene object.
            scene = new THREE.Scene();

            // Add the light.
            light = new THREE.PointLight(0xffffff, 1);
            light.position.set(1, 1, 1.3);
            scene.add(light);

            // Add the ball.
            g = new THREE.SphereGeometry(ballRadius, 32, 16);
            m = new THREE.MeshPhongMaterial({ map: ironTexture });
            ballMesh = new THREE.Mesh(g, m);
            ballMesh.position.set(1, 1, ballRadius);
            scene.add(ballMesh);

            // Add the camera.
            var aspect = window.innerWidth / window.innerHeight;
            camera = new THREE.PerspectiveCamera(60, aspect, 1, 1000);
            camera.position.set(1, 1, 5);
            scene.add(camera);

            // Add the maze.
            mazeMesh = generate_maze_mesh(maze);
            scene.add(mazeMesh);

            // Add the ground.
            g = new THREE.PlaneGeometry(mazeDimension * 10, mazeDimension * 10, mazeDimension, mazeDimension);
            planeTexture.wrapS = planeTexture.wrapT = THREE.RepeatWrapping;
            planeTexture.repeat.set(mazeDimension * 5, mazeDimension * 5);
            m = new THREE.MeshPhongMaterial({ map: planeTexture });
            planeMesh = new THREE.Mesh(g, m);
            planeMesh.position.set((mazeDimension - 1) / 2, (mazeDimension - 1) / 2, 0);
            planeMesh.rotation.set(Math.PI / 2, 0, 0);
            scene.add(planeMesh);

        }


        function updatePhysicsWorld() {

            // Apply "friction". 
            var lv = wBall.GetLinearVelocity();
            lv.Multiply(0.95);
            wBall.SetLinearVelocity(lv);

            // Apply user-directed force.
            var f = new b2Vec2(keyAxis[0] * wBall.GetMass() * 0.25, keyAxis[1] * wBall.GetMass() * 0.25);
            wBall.ApplyImpulse(f, wBall.GetPosition());
            keyAxis = [0, 0];

            // Take a time step.
            wWorld.Step(1 / 60, 8, 3);
        }


        function updateRenderWorld() {

            // Update ball position.
            var stepX = wBall.GetPosition().x - ballMesh.position.x;
            var stepY = wBall.GetPosition().y - ballMesh.position.y;
            ballMesh.position.x += stepX;
            ballMesh.position.y += stepY;

            // Update ball rotation.
            var tempMat = new THREE.Matrix4();
            tempMat.makeRotationAxis(new THREE.Vector3(0, 1, 0), stepX / ballRadius);
            tempMat.multiplySelf(ballMesh.matrix);
            ballMesh.matrix = tempMat;
            tempMat = new THREE.Matrix4();
            tempMat.makeRotationAxis(new THREE.Vector3(1, 0, 0), -stepY / ballRadius);
            tempMat.multiplySelf(ballMesh.matrix);
            ballMesh.matrix = tempMat;
            ballMesh.rotation.getRotationFromMatrix(ballMesh.matrix);

            // Update camera and light positions.
            camera.position.x += (ballMesh.position.x - camera.position.x) * 0.1;
            camera.position.y += (ballMesh.position.y - camera.position.y) * 0.1;
            camera.position.z += (5 - camera.position.z) * 0.1;
            light.position.x = camera.position.x;
            light.position.y = camera.position.y;
            light.position.z = camera.position.z - 3.7;

            // Update level progress
            var distanceToFinish = Math.sqrt(Math.pow(mazeDimension - ballMesh.position.x, 2) + Math.pow((mazeDimension - 2) - ballMesh.position.y, 2));
            var totalDistance = Math.sqrt(Math.pow(mazeDimension - 1, 2) + Math.pow((mazeDimension - 2) - 1, 2));
            levelProgress = ((totalDistance - distanceToFinish) / totalDistance) * 100;
        }


        function gameLoop() {

            switch (gameState) {

                case 'initialize':
                    checkCookie(); // Check if a level cookie exists
                    maze = generateSquareMaze(mazeDimension);
                    maze[mazeDimension - 1][mazeDimension - 2] = false;
                    createPhysicsWorld();
                    createRenderWorld();
                    camera.position.set(1, 1, 5);
                    light.position.set(1, 1, 1.3);
                    light.intensity = 0;
                    var level = Math.floor((mazeDimension - 1) / 2 - 4);
                    $('#level').html('Level ' + level);
                    gameState = 'fade in';
                    break;

                case 'fade in':
                    light.intensity += 0.1 * (1.0 - light.intensity);
                    renderer.render(scene, camera);
                    if (Math.abs(light.intensity - 1.0) < 0.05) {
                        light.intensity = 1.0;
                        gameState = 'play'
                    }
                    break;

                case 'play':
                    updatePhysicsWorld();
                    updateRenderWorld();
                    renderer.render(scene, camera);

                    // Check for victory.
                    var mazeX = Math.floor(ballMesh.position.x + 0.5);
                    var mazeY = Math.floor(ballMesh.position.y + 0.5);
                    if (mazeX == mazeDimension && mazeY == mazeDimension - 2) {
                        mazeDimension += 2;
                        if (saveProgress) {
                            setCookie("level", mazeDimension, 30); // Save the level in cookie for 30 days
                        }
                        gameState = 'fade out';
                    }
                    break;

                case 'fade out':
                    updatePhysicsWorld();
                    updateRenderWorld();
                    light.intensity += 0.1 * (0.0 - light.intensity);
                    renderer.render(scene, camera);
                    if (Math.abs(light.intensity - 0.0) < 0.1) {
                        light.intensity = 0.0;
                        renderer.render(scene, camera);
                        gameState = 'initialize'
                    }
                    break;

            }

            requestAnimationFrame(gameLoop);

        }


        function onResize() {
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        }


        function onMoveKey(axis) {
            keyAxis = axis.slice(0);
        }

        function onTouchMove(event) {
            var touch = event.touches[0];
            mouseX = touch.clientX;
            mouseY = touch.clientY;
            var windowHalfX = window.innerWidth / 2;
            var windowHalfY = window.innerHeight / 2;
            keyAxis[0] = (mouseX - windowHalfX) / windowHalfX;
            keyAxis[1] = -(mouseY - windowHalfY) / windowHalfY; // Invert the Y direction only for touch controls
        }

         function handleOrientation(event) {
    var x = event.beta;  // In degree in the range [-180,180]
    var y = event.gamma; // In degree in the range [-90,90]

    // Normalize the values to range [-1,1]
    var normalizedX = x / 50;
    var normalizedY = y / 50;

    // Make left-right movements twice as fast as up-down movements
    keyAxis[0] = normalizedY * 2; // Use gamma (x-axis) for horizontal movement, doubled for speed
    keyAxis[1] = -normalizedX; // Use beta (y-axis) for vertical movement, inverted for intuitive control
}


        jQuery.fn.centerv = function() {
            wh = window.innerHeight;
            h = this.outerHeight();
            this.css("position", "absolute");
            this.css("top", Math.max(0, (wh - h) / 2) + "px");
            return this;
        }


        jQuery.fn.centerh = function() {
            ww = window.innerWidth;
            w = this.outerWidth();
            this.css("position", "absolute");
            this.css("left", Math.max(0, (ww - w) / 2) + "px");
            return this;
        }


        jQuery.fn.center = function() {
            this.centerv();
            this.centerh();
            return this;
        }

        function deleteProgress() {
            document.cookie = "level=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            alert("Your progress has been deleted.");
            location.reload();
        }

     $(document).ready(function() {

    // Prepare the instructions.
    $('#instructions').center();
    $('#instructions').hide();
    KeyboardJS.bind.key('i', function() { $('#instructions').show() },
        function() { $('#instructions').hide() });

    // Create the renderer.
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Bind keyboard and resize events.
    KeyboardJS.bind.axis('left', 'right', 'down', 'up', onMoveKey);
    KeyboardJS.bind.axis('h', 'l', 'j', 'k', onMoveKey);
    // Bind WASD keys for movement
    KeyboardJS.bind.axis('a', 'd', 's', 'w', onMoveKey);

    $(window).resize(onResize);

    // Bind touch events
    document.addEventListener('touchmove', onTouchMove, false);

    // Bind device orientation event
    window.addEventListener('deviceorientation', handleOrientation);

    // Set the initial game state.
    gameState = 'initialize';

    // Start the game loop.
    requestAnimationFrame(gameLoop);

});


      





        /////mazecode
function generateSquareMaze(dimension) {

    function iterate(field, x, y) {
        field[x][y] = false;
        while(true) {
            directions = [];
            if(x > 1 && field[x-2][y] == true) {
                directions.push([-1, 0]);
            }
            if(x < field.dimension - 2 && field[x+2][y] == true) {
                directions.push([1, 0]);
            }
            if(y > 1 && field[x][y-2] == true) {
                directions.push([0, -1]);
            }
            if(y < field.dimension - 2 && field[x][y+2] == true) {
                directions.push([0, 1]);
            }
            if(directions.length == 0) {
                return field;
            }
            dir = directions[Math.floor(Math.random()*directions.length)];
            field[x+dir[0]][y+dir[1]] = false;
            field = iterate(field, x+dir[0]*2, y+dir[1]*2);
        }
    }

    // Initialize the field.
    var field = new Array(dimension);
    field.dimension = dimension;
    for(var i = 0; i < dimension; i++) {
        field[i] = new Array(dimension);
        for (var j = 0; j < dimension; j++) {
            field[i][j] = true;
        }
    }

    // Gnerate the maze recursively.
    field = iterate(field, 1, 1);
    
    return field;

}


