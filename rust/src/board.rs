
pub struct Board {
    width: i32,
    height: i32,

    been_drawn: bool,
    newlines_drawn: i32,
    draw_count: i32,

    fps: i32,
    fps_time: f64,

    str_board: Vec<String>
}

impl Board {
    // A kind of constructor for the board
    fn new(width: i32, height: i32) -> Board {
        Board {
            width: width,
            height: height,

            been_drawn: false,
            newlines_drawn: 0,
            draw_count: 0,

            fps: 0,
            fps_time: 0.0,

            str_board: vec![String::from(" "); (width*height) as usize]
        }
    }

    // Set the contents of a cell
    fn set_cell(&mut self, x: i32, y: i32, val: String){
        let position = ((self.width * y) + x) as usize;
        self.str_board[position] = val.clone();
        //let mut cell = self.str_board.get_mut(position);
        //cell.clear();
        //cell.push_str(val)
    }

    fn get_board(&mut self) -> String {
        let mut collector: Vec<String> = Vec::new();
        for row in 0..self.height {
            let start = (row * self.width) as usize;
            let stop = start + self.width as usize - 1;
            collector.push(self.str_board[start..stop].join(""));
        }
        collector[..].join("\r\n")
    }
}

#[test]
fn test_board_create() {
    let board = Board::new(3, 4);
}

#[test]
fn test_board_set() {
    let mut board = Board::new(3, 4);

    board.set_cell(0, 0, String::from("0"));
    board.set_cell(1, 0, String::from("1"));
    //board.str_board[0] = String::from("0");
    //println!("'{}'", &board.str_board[..].join(""));

    assert_eq!(&board.str_board[0], "0");
    assert_eq!(&board.str_board[1], "1");
}



