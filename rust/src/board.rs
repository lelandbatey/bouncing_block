
use std::fmt;
use time;
use regex::Regex;
use util;

pub struct Board {
    width: i32,
    height: i32,

    been_drawn: bool,
    draw_count: i32,

    fps: i32,
    fps_time: time::Tm,

    str_board: Vec<Vec<String>>
}

impl Board {
    // A kind of constructor for the board
    fn new(width: i32, height: i32) -> Board {
        Board {
            width: width,
            height: height,

            been_drawn: false,
            draw_count: 0,

            fps: 0,
            fps_time: time::now(),

            str_board: vec![vec![String::from(" "); width as usize]; height as usize]
        }
    }

    // Set the contents of a cell
    fn set_cell(&mut self, x: i32, y: i32, val: String){
        // Since rust only implements remainder, this is an add-hoc modulus
        let col = util::modulus(x, self.width);
        let mut row = util::modulus(y, self.width);
        // Invert the y axis so it's more like a cartesian plane
        row = self.height - 1 - y;

        let ref mut cell: String = self.str_board[row as usize][col as usize];
        cell.clear();
        cell.push_str(&val)
    }

    fn board_str(&mut self) -> String {
        let mut collector: Vec<String> = Vec::new();
        for row in &self.str_board {
            collector.push(row[..].join(""));
        }
        collector[..].join("\r\n")
    }

    fn get_frame(&mut self) -> String {
        let mut frame: Vec<String> = Vec::new();

        // Add "up" control sequences
        if self.been_drawn {
            for _ in 0..(self.height+1){
                frame.push(String::from("\r\x1B[1F"));
            }
        }

        // Add contents of board
        frame.push(self.board_str());

        let len_fps_measure = time::Duration::seconds(1);
        if time::now() - self.fps_time >= len_fps_measure {
            self.fps = self.draw_count;
            self.draw_count = 0;
            self.fps_time = time::now();
        }

        frame.push(format!("FPS: {}\r\n", self.fps));

        self.been_drawn = true;

        frame[..].join("\r\n")
    }
}

#[test]
fn test_board_create() {
    let board = Board::new(4, 3);
}

#[test]
fn test_board_set() {
    let mut board = Board::new(4, 3);

    board.set_cell(0, 0, String::from("0"));
    board.set_cell(1, 0, String::from("1"));
    //println!("'{}'", board.get_board());

    assert_eq!(&board.str_board[2][0], "0");
    assert_eq!(&board.str_board[2][1], "1");
}

#[test]
fn test_board_frame_upcode() {
    //panic!();
    let tst_height = 3;

    let mut board = Board::new(4, tst_height);
    board.been_drawn = true;


    {
        // Check that the correct number of "up" control characters are being printed
        let frame = board.get_frame();
        let v: Vec<&str> = frame.split("\r\x1B[1F").collect();
        println!("{} ?= {}", v.len(), tst_height);
        assert!(v.len()-1 == (tst_height+1) as usize);
    }
}

#[test]
fn test_board_frame_newlines() {
    let tst_height = 3;
    let mut board = Board::new(4, tst_height);
    let re = Regex::new(r"\r\n").unwrap();
    {
        // Check that the correct number of newlines are in the frame:
        //     newlines == height+1
        let frame = board.get_frame();
        let nl_count = re.captures_iter(&frame).count();
        assert!(nl_count == (tst_height + 1) as usize);
    }
}

#[test]
fn test_board_frame_fps() {
    let tst_fps = 25;
    let mut board = Board::new(4, 3);
    board.fps = tst_fps;

    let re = Regex::new(r"FPS: (\d+)").unwrap();

    let frame = board.get_frame();

    let caps = re.captures(&frame).unwrap();
    let correct_str = &format!("{}", tst_fps)[..];
    assert_eq!(caps.at(1), Some(correct_str));
}


