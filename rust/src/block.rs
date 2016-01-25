
use time;
use rand;

pub struct Block {
    creation_time: time::Tm,
    bounce_start: time::Tm,

    init_x_vel: f64,
    init_y_vel: f64,

    color: String,

    gravity: f32
}

impl Block {
    fn new(x_vel: f64, y_vel: f64, color: &str) {
        let millis: i64 = 1000 * (rand::random() * rand::random());
        let time_delt = time::Duration::milliseconds(milis);
        Block {
            creation_time: time::now(),
            bounce_start: time::now(),

            init_x_vel: x_vel,
            init_y_vel: y_vel,

            color: String::from(color),
            f
        }
    }
}
