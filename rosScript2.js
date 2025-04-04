console.clear();
console.log("JS Loaded");

const ip = '192.168.8.104';
const port = 9012;


// Timer variables
let timerInterval;
let time_ms = 0;

// Timer elements
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const clockDisplay = document.getElementById('Clock');

// Timer functions
function startTimer() {
    console.log('Timer started');
    timerInterval = setInterval(() => {
        time_ms += 10;
        const minutes = Math.floor(time_ms / (1000 * 60));
        const seconds = Math.floor((time_ms % (1000 * 60)) / 1000);
        const ms = time_ms % 1000;
        clockDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${ms.toString().padStart(3, '0')}`;
    }, 10);
}

function stopTimer() {
    clearInterval(timerInterval);
    console.log("Timer stopped");
}

// startBtn.addEventListener('click', startTimer);
// stopBtn.addEventListener('click', stopTimer);

function resetTimer() {
    time_ms = 0;
    clockDisplay.textContent = "00:00:00";
    console.log("Timer reset");
}

document.addEventListener("DOMContentLoaded", () => {
    // grab the elements
    let initialOffset = null;
    const conBtn = document.getElementById('SubmitBttn'); // submit button
    const fwdBtn = document.getElementById('forwardButton'); // forward button
    const lefBtn = document.getElementById('leftButton') // left 
    const rightBtn = document.getElementById('rightButton') // right
    const nameInput = document.getElementById('nameInput'); // robot name input
    const battVoltage = document.getElementById('BattVolt'); // battery voltage
    const status = document.getElementById('statusText'); // status text
    const valX = document.getElementById('valX'); // x value
    const valY = document.getElementById('valY'); // y value
    const valYaw = document.getElementById('valYaw'); // yaw value
    // status button
    const armBtn = document.getElementById('armedBtn');
    const disBtn = document.getElementById('disBtn');
    // mode buttons
    const leftModeBtn = document.getElementById('leftModeButton');
    const rightModeBtn = document.getElementById('rightModeButton');
    const centerModeBtn = document.getElementById('centerModeButton');
    const statusText = document.getElementById('statusModeText');
    const DriveModeText = document.getElementById('driveModeText');


    // get manual
    const manualBtn = document.getElementById('ManualButton');

    // // get canvas
    // const lidarCanvas = document.getElementById('lidarCanvas');
    // const ctx = lidarCanvas.getContext('2d'); // get the context

    // Get canvas and context
    const canvas = document.getElementById('robotCanvas');
    const ctx = canvas.getContext('2d');

    // Scaling factor (adjust as needed)
    const SCALE = 50;
    let positions = [];  // Store robot's movement history


    let ros, BattTopic, cmdVelTopic, odomTopic, IRTopic, testTopic, modeTopic, statusTopic; // declare globally but initialize dynamically

    nameInput.value = 'bravo';


    // function to publish mode topic
    function publishModeMessage(message) {
        if (modeTopic) {
            const mode_msg = new ROSLIB.Message({
                data: message
            });
            modeTopic.publish(mode_msg);
            console.log(`Published: ${message}`);
        } else {
            console.error("Mode topic is not initialized!");
        }
    }

    // function to publish status topic
    function publishStatusMessage(message) {
        if (statusTopic) {
            const status_msg = new ROSLIB.Message({
                data: message
            });
            statusTopic.publish(status_msg);
            console.log(`Published: ${message}`);
        } else {
            console.error("Status topic is not initialized!");
        }
    }



    // function to publish a message to the test topic
    // Function to publish test messages
    function publishTestMessage(message) {
        if (testTopic) {
            const test_msg = new ROSLIB.Message({
                data: message
            });
            testTopic.publish(test_msg);
            console.log(`Published: ${message}`);
        } else {
            console.error("Test topic is not initialized!");
        }
    }

    // function to initialize ROS connection

    function initializeROS() {
        const robotName = nameInput.value.trim(); // get updated value
        if (!robotName) {
            console.error("Robot name is required!");
            return;
        }

        console.log(`Initializing ROS for robot: ${robotName}`);

        // 1. create a ROS instance
        ros = new ROSLIB.Ros({
            url: `ws://${ip}:${port}`
        });

        // 2. handle connection status
        ros.on('connection', () => {
            console.log(`Connected`);
            status.textContent = 'Connected';
            status.style.color = 'green';
        });

        ros.on('error', (error) => {
            console.error("Connection error:", error);
            status.textContent = 'Error';
            status.style.color = 'red';
        });

        // create a topic for python to subscribe to
        testTopic = new ROSLIB.Topic({
            ros: ros,
            name: `/test`,
            messageType: 'std_msgs/String'
        });

        // create mode topic
        modeTopic = new ROSLIB.Topic({
            ros: ros,
            name: `/mode`,
            messageType: 'std_msgs/String'
        });

        // create status topic
        statusTopic = new ROSLIB.Topic({
            ros: ros,
            name: `/status`,
            messageType: 'std_msgs/String'
        });

        // create the odometry topic dynamically
        odomTopic = new ROSLIB.Topic({
            ros: ros,
            name: `/${robotName}/odom`,
            messageType: 'nav_msgs/Odometry'
        });

        IRTopic = new ROSLIB.Topic({
            ros: ros,
            name: `/${robotName}/ir_intensity`,
            messageType: 'irobot_create_msgs/IrIntensityVector'
        })

        // ivette's topic
        IvetteMode = new ROSLIB.Topic({
            ros: ros,
            name: `/send`,
            messageType: 'std_msgs/String'
        });

        // 4. subscribe to the topic
        IvetteMode.subscribe((mode_message) => {
            // console.log(battery_message)
            DriveModeText.textContent = mode_message.data;
        });
        // // subscribe to the odom topic
        // odomTopic.subscribe((odom_message) => {
        //     // extract the odom values
        //     const position = odom_message.pose.pose.position;
        //     const orientation = odom_message.pose.pose.orientation;

        //     // update the x and y values as the robot moves
        //     valX.textContent = position.x.toFixed(2);
        //     valY.textContent = position.y.toFixed(2);

        //     // 
        //     const y_q = orientation.y.toFixed(2);
        //     const z_q = orientation.z.toFixed(2);
        //     const w_q = orientation.w.toFixed(2);

        //     const yaw = Math.atan2(2 * (w_q * z_q + y_q * 0), 1 - 2 * (y_q * y_q + z_q * z_q));

        //     // console.log(`Yaw: ${yaw}, X: ${position.x}, Y: ${position.y}, Z: ${position.z}`);

        //     valX.textContent = position.x.toFixed(2);
        //     valY.textContent = position.y.toFixed(2);
        //     valYaw.textContent = yaw.toFixed(2);

        // });
        odomTopic.subscribe((odom_message) => {
            const position = odom_message.pose.pose.position;

            if (!initialOffset) {
                initialOffset = { x: position.x, y: position.y };
            }

            const relX = position.x - initialOffset.x;
            const relY = position.y - initialOffset.y;

            let x = canvas.width / 2 + relX * SCALE;
            let y = canvas.height / 2 - relY * SCALE;

            valX.textContent = relX.toFixed(2);
            valY.textContent = relY.toFixed(2);

            // Store and draw
            positions.push({ x, y });

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.beginPath();
            ctx.moveTo(positions[0].x, positions[0].y);
            positions.forEach(pos => ctx.lineTo(pos.x, pos.y));
            ctx.strokeStyle = "red";
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.fillStyle = "blue";
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 2 * Math.PI);
            ctx.fill();
        });

        // test for lidar topic

        // subscribe to lidar topic


        IRTopic.subscribe((irmsg) => {
            let ir_readings = irmsg['readings'].map((r) => r['value']);

            // console.log(ir_readings);

            // Define max value (adjust based on real sensor range)
            let max_value = 3000;

            ir_readings.forEach((value, index) => {
                let sensor = document.getElementById(`ir-sensor-${index + 1}`);

                // Scale factor for size growth
                let scale = 1 + (value / max_value) * 2; // Base size + scale

                // Adjust background color based on intensity
                let intensity = value / max_value; // Normalize 0 to 1
                let redIntensity = Math.min(255, Math.floor(intensity * 255)); // Convert to RGB (0-255)

                // Apply styles
                sensor.style.transform = `scale(${scale})`;
                sensor.style.backgroundColor = `rgb(${redIntensity}, 0, 0)`; // Red color effect
            });
        });




        BattTopic = new ROSLIB.Topic({
            ros: ros,
            name: `/${robotName}/battery_state`,
            messageType: 'sensor_msgs/BatteryState'

        });

        // 4. subscribe to the topic
        BattTopic.subscribe((battery_message) => {
            // console.log(battery_message)
            battVoltage.textContent = battery_message['voltage'].toFixed(3);

        });

        // 5. make a topic for cmd_vel
        cmdVelTopic = new ROSLIB.Topic({
            ros: ros,
            name: `${robotName}/cmd_vel`,
            messageType: 'geometry_msgs/Twist'
        });


        fwdBtn.addEventListener('click', () => {
            console.log('Moving Forward');
            // publish test message
            publishTestMessage('w');
            // after 2 seconds then publih an empty message
            setTimeout(() => {
                publishTestMessage('');
            }, 500);
        });
        // make a topic
        // . make a right event listener
        lefBtn.addEventListener('click', () => {
            console.log('Moving Left')
            publishTestMessage('a');
            // after 2 seconds then publih an empty message
            setTimeout(() => {
                publishTestMessage('');
            }, 500);
        });

        rightBtn.addEventListener('click', () => {
            console.log('Moving Right')
            publishTestMessage('d');
            // after 2 seconds then publih an empty message
            setTimeout(() => {
                publishTestMessage('');
            }, 500);
        });

        // status btn event listener
        armBtn.addEventListener('click', () => {
            console.log('Armed');
            publishTestMessage('armed');
            statusText.textContent = 'Armed'
        });

        disBtn.addEventListener('click', () => {
            console.log('Disarmed');
            publishTestMessage('disarmed');
            console.log('published')
            statusText.textContent = 'Disarmed'

        });

        // mode btn event listeners
        leftModeBtn.addEventListener('click', () => {
            console.log('Left Mode');
            publishTestMessage('l');
            DriveModeText.textContent = 'Left'
        });

        rightModeBtn.addEventListener('click', () => {
            console.log('Right Mode');
            publishTestMessage('r');
            DriveModeText.textContent = 'Right'
        });

        centerModeBtn.addEventListener('click', () => {
            console.log('Center Mode');
            publishTestMessage('c');
            DriveModeText.textContent = 'Center'
        });

        manualBtn.addEventListener('click', () => {
            console.log('Manual Mode');
            publishTestMessage('manual');
            resetTimer;
        });

        startBtn.addEventListener('click', () => {

            console.log('timer started')
            publishTestMessage('c')
            startTimer();

        })

        stopBtn.addEventListener('click', () => {

            console.log('timer stoped')
            publishTestMessage('manual')
            stopTimer();

        })


    }

    conBtn.addEventListener('click', () => {
        //clear all previous ros
        if (ros) {

            ros.close()
        }

        initializeROS();
    });

});