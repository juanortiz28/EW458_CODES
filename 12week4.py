import roslibpy
import time
from pynput import keyboard

class KeyboardController:
    def __init__(self, robot_name, ros_ip, ros_port):
        """Initialize the keyboard controller with ROS and Pynput."""
        self.robot_name = robot_name
        self.ros = roslibpy.Ros(host=ros_ip, port=ros_port)
        self.ros.run()

        # ROS Topics
        self.drive_topic = roslibpy.Topic(self.ros, f'/{robot_name}/cmd_vel', 'geometry_msgs/msg/Twist')
        self.ir_topic = roslibpy.Topic(self.ros, f'/{robot_name}/ir_intensity', 'irobot_create_msgs/IrIntensityVector')
        self.ir_topic.subscribe(self.ir_callback)
        self.web_topic = roslibpy.Topic(self.ros, f'/test', 'std_msgs/String')
        self.web_topic.subscribe(self.web_callback)
        self.send_topic = roslibpy.Topic(self.ros, f'/send', 'std_msgs/String')
        # State Variables
        self.armed = False
        self.mode = 'manual'  # Default mode: Manual
        self.movement = {"forward": False, "left": False, "right": False}
        self.modeLetter= None  # Web-controlled mode (default: None)
        # Pynput Listener
        self.keyboard = keyboard.Listener(on_press=self.MODE, on_release=self.STOP)
        self.keyboard.start()

        # Wall Following Parameters
        self.V_p = 0.005  # Proportional gain for forward speed
        self.V_d = 0.01 # Derivative gain for forward speed 
        self.W_p = 0.01 # Proportional gain for angular speed
        self.W_d = 0.01 # Derivative gain for angular speed
        self.desVdist = 80  # Desired front/lr distance
        self.desWdist = 100  # Desired sides distance
        self.initvE = 0 #initialize previous error
        self.initwE = 0 #initialize previous error

    def ir_callback(self, message):
        """Callback function to process IR sensor data."""
        ir_readings = message['readings']
        self.IRlist = [reading['value'] for reading in ir_readings]

    def web_callback(self, message):
        """Callback function to process IR sensor data."""
        self.modeLetter = message['data']
        print(self.modeLetter)
        if self.modeLetter != '':
            self.WEB_MODE()
        else:
            self.WEB_STOP()
        
    def drive(self, v, w):
        """Send movement command via ROS."""
        drive_msg = {
            'linear': {'x': v, 'y': 0.0, 'z': 0.0},
            'angular': {'x': 0.0, 'y': 0.0, 'z': w}
        }
        self.drive_topic.publish(roslibpy.Message(drive_msg))

    def MODE(self, key):
        """Handles key press events."""
        # Handle special keys directly without using 'char'
        if key == keyboard.Key.space:  # Spacebar press (for arm/disarm)
            self.armed = not self.armed
            if self.armed:
                print("ARMED")
            else:
                print("DISARMED")
        
        # Handle printable characters (with 'char' attribute)
        elif hasattr(key, 'char') and key.char:  # Check if it's a printable key
            if key.char == 'q':
                self.ros.terminate()
                return False
            elif key.char == 'w':
                self.movement["forward"] = True
            elif key.char == 'a':
                self.movement["left"] = True
            elif key.char == 'd':
                self.movement["right"] = True
            elif key.char == 'm':  # Manual Mode
                if self.mode != 'manual':
                    print("MANUAL mode")
                self.mode = 'manual'
            elif key.char == 'l':  # Left Wall Follow
                if self.mode != 'left':
                    print("LEFT Wall Follow mode")
                self.mode = 'left'
            elif key.char == 'r':  # Right Wall Follow
                if self.mode != 'right':
                    print("RIGHT Wall Follow mode")
                self.mode = 'right'
            elif key.char == 'c':  # Center Wall Follow
                if self.mode != 'center':
                    print("CENTER Wall Follow mode")
                self.mode = 'center'

    def WEB_MODE(self):
        # Handle printable characters (with 'char' attribute)
        if self.modeLetter == 'q':
            self.ros.terminate()
            return False
        elif self.modeLetter == 'armed':
            self.armed = True
            print("ARMED")
        elif self.modeLetter == 'disarmed':
            self.armed = False
            print("DISARMED")
        elif self.modeLetter == 'w':
            self.movement["forward"] = True
        elif self.modeLetter == 'a':
            self.movement["left"] = True
        elif self.modeLetter == 'd':
            self.movement["right"] = True
        elif self.modeLetter == 'manual':  # Manual Mode
            if self.mode != 'manual':
                print("MANUAL mode")
            self.mode = 'manual'
        elif self.modeLetter == 'l':  # Left Wall Follow
            if self.mode != 'left':
                print("LEFT Wall Follow mode")
            self.mode = 'left'
        elif self.modeLetter == 'r':  # Right Wall Follow
            if self.mode != 'right':
                print("RIGHT Wall Follow mode")
            self.mode = 'right'
        elif self.modeLetter == 'c':  # Center Wall Follow
            if self.mode != 'center':
                print("CENTER Wall Follow mode")
            self.mode = 'center'

    def STOP(self, key):
        """Handles key release events."""
        # Only handle keys that have the 'char' attribute (i.e., printable keys)
        if hasattr(key, 'char') and key.char:
            if key.char == 'w':
                self.movement["forward"] = False
            elif key.char == 'a':
                self.movement["left"] = False
            elif key.char == 'd':
                self.movement["right"] = False

    def WEB_STOP(self):
        """Handles key release events."""
        # Only handle keys that have the 'char' attribute (i.e., printable keys)
        self.movement["forward"] = False
        self.movement["left"] = False
        self.movement["right"] = False



    def drive_loop(self):
        """Simplified drive loop: constant forward motion + wall-following + basic obstacle avoidance."""
        if self.armed and self.mode == 'manual':
            v = 0.3 if self.movement["forward"] else 0
            w = 2.0 if self.movement["left"] else -2.0 if self.movement["right"] else 0
            self.drive(v, w)

        elif self.armed and self.mode in ['left', 'right', 'center']:
            if hasattr(self, 'IRlist'):
                # === Sensor Values ===
                left = self.IRlist[0]
                back_left = self.IRlist[1]
                front_left = self.IRlist[2]
                front = self.IRlist[3]
                front_right = self.IRlist[4]
                back_right = self.IRlist[5]
                right = self.IRlist[6]

                # === Wall Mode Switching ===
                left_wall_seen = left<30
                right_wall_seen = right<30

                if left_wall_seen and right_wall_seen:
                    self.mode = 'center'
                elif left_wall_seen:
                    self.mode = 'left'
                elif right_wall_seen:
                    self.mode = 'right'
                else:
                    self.mode = 'center'
                self.modeStr = {'data': self.mode}
                self.send_topic.publish(roslibpy.Message(self.modeStr))
                # === Forward Speed ===
                v = 0.5  

                # === Turn Control (PD) ===
                if self.mode == 'left':
                    sideE = self.desWdist - left
                elif self.mode == 'right':
                    sideE = right - self.desWdist
                else:  # center
                    sideE = right - left

                sideEDer = sideE - getattr(self, 'initwE', 0)
                self.initwE = sideE
                w = self.W_p * sideE + self.W_d * sideEDer

                # === Obstacle Avoidance with All Front Sensors ===
                obstacle_close = any(sensor > 50 for sensor in [front, front_left, front_right, back_left, back_right])

                if obstacle_close:
                    # Difference between left and right obstacle "pressure"
                    leftP = front_left + back_left
                    rightP = front_right + back_right
                    diffP = leftP - rightP + front

                    # Scale turn rate based on how strong the pressure is
                    w -= 0.01 * diffP  # turn away from higher pressure


                self.drive(v, w)
                # Print debug information
                print(f"mode: {self.mode}, w: {w:.2f}, left: {left:.2f}, right: {right:.2f}")
            else:
                print("IR sensor values not available.")

        elif not self.armed:
            self.drive(0, 0)

    def run(self):
        """Main control loop to process keyboard inputs and robot control."""
        try:
            while True:
                self.drive_loop()
                time.sleep(0.1)  # Reduce CPU usage
        except KeyboardInterrupt:
            print("\n Stopping Keyboard Controller...")
        finally:
            self.drive(0, 0)  # Stop robot movement on exit
            self.ros.terminate()
            print("Keyboard Controller Exited.")

if __name__ == "__main__":
    robot_name = "bravo"
    ros_ip = "192.168.8.104"  # Change to match your ROS instance
    # ros_ip = "127.0.0.1"  # Change to match your ROS instance
    ros_port = 9012  # Change to your ROS port
    controller = KeyboardController(robot_name, ros_ip, ros_port)
    controller.run() 