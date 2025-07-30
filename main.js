// let legalSquares = []; instead of defining a global variable for keeping track of legal squares and modifying it using functions, those functions that are for retrieving legal moves will be changed to return legal squares directly
let boardSquaresArray = []; //stores information about each square on the chessboard and the piece occupying it
let isWhiteTurn = true;
let whiteKingSquare = "e1"; //to detect and prevent moves that would put the king in check (by keeping track of the king's square every time it moves)
let blackKingSquare = "e8";

let checkDetectionEnabled = false;
let highlightLegalMovesEnabled = false;

const boardSquares = document.getElementsByClassName("square");
const pieces = document.getElementsByClassName("piece");
const piecesImages = document.getElementsByTagName("img");

document.getElementById("checkBtn").addEventListener("click", () => {
    checkDetectionEnabled = !checkDetectionEnabled;
    document.getElementById("checkBtn").innerText = checkDetectionEnabled ? "Disable Check Detection" : "Enable Check Detection";
});

document.getElementById("highlightBtn").addEventListener("click", () => {
    highlightLegalMovesEnabled = !highlightLegalMovesEnabled;
    document.getElementById("highlightBtn").innerText = highlightLegalMovesEnabled
        ? "Hide Legal Moves"
        : "Show Legal Moves";
});

document.getElementById("restartBtn").addEventListener("click", () => {
    location.reload(); //easiest method to reset everything
});

fillBoardSquaresArray();
setupBoardSquares();
setupPieces();

function deepCopyArray(array) {
    //map method = built-in JS function that creates a new array populated with the results of calling a provided function on every element in the calling array
    //the map method takes a callback function as its first argument, which is called for each element in the array
    //the callback function is passed up to two arguments: the current element being processed and its index (optional) 
    let arrayCopy = array.map(element => {
        return {...element} //return value of the callback function is added as a single element in the new array
    });
    return arrayCopy;
}

//instead of working with html elements to get square and piece properties, the chessboard squares and pieces on each square will be saved in an array, all work will be done using this array (boardSquaresArray)
function fillBoardSquaresArray() {
    const boardSquares = document.getElementsByClassName("square");
    //each element in the array is an object containing squareId, pieceId, pieceType and pieceColor properties. The squareId property represents the square's identifier,
    //while the pieceId, pieceType and pieceColor properties represent the identifier, type and color of the piece occupying the square, respectively
    for (let i=0; i<boardSquares.length; i++) {
        let row = 8-Math.floor(i/8);
        let column = String.fromCharCode(97+(i%8));
        let square = boardSquares[i];
        square.id = column+row;
        let color = "";
        let pieceType = "";
        let pieceId = "";
        if (square.querySelector(".piece")) {
            color = square.querySelector(".piece").getAttribute("color");
            pieceType = square.querySelector(".piece").classList[1];
            pieceId = square.querySelector(".piece").id;
        } else {
            color = "blank";
            pieceType = "blank";
            pieceId = "blank";
        }
        let arrayElement = {
            squareId: square.id,
            pieceColor: color,
            pieceType: pieceType,
            pieceId: pieceId
        };
        boardSquaresArray.push(arrayElement); //when the page loads, the board squares array should be filled with information about the initial position of the pieces on the chessboard
                                              //this array will be updated after each move to reflect the current state of the chessboard
    }
}

function setupBoardSquares() {
    for (let i=0; i<boardSquares.length; i++) {
        boardSquares[i].addEventListener("dragover", allowDrop);
        boardSquares[i].addEventListener("drop", drop);
        let row = 8-Math.floor(i/8);
        let column = String.fromCharCode(97+(i%8));
        let square = boardSquares[i];
        square.id = column+row;
    }
}

function setupPieces() {
    for (let i=0; i<pieces.length; i++) {
        pieces[i].addEventListener("dragstart", drag);
        pieces[i].setAttribute("draggable", true);
        pieces[i].id = pieces[i].className.split(" ")[1] + pieces[i].parentElement.id;
    }
    for (let i=0; i<piecesImages.length; i++) {
        piecesImages[i].setAttribute("draggable", false);
    }
    highlightActivePieces();
}

function highlightActivePieces() {
    const currentColor = isWhiteTurn ? "white" : "black";

    for (let piece of document.getElementsByClassName("piece")) {
        const pieceColor = piece.getAttribute("color");
        if (pieceColor === currentColor) {
            piece.classList.add("active-turn");
        } else {
            piece.classList.remove("active-turn");
        }
    }
}

function allowDrop(ev) {
    ev.preventDefault();
}

function drag(ev) {
    const piece = ev.target;
    piece.classList.add("dragging"); //to remove square highlight when a piece is being dragged
    const pieceColor = piece.getAttribute("color");
    //modified drag event function to send pieceId and startSquareid to the drop event
    const pieceType = piece.classList[1];
    const pieceId = piece.id;
    if ((isWhiteTurn && pieceColor=="white") || (!isWhiteTurn && pieceColor=="black")) { //valid turn, continue
        const startingSquareId = piece.parentNode.id;
        ev.dataTransfer.setData("text", piece.id+"|"+startingSquareId);
        const pieceObject = {pieceColor: pieceColor, pieceType: pieceType, pieceId: pieceId};

        //the function should also send the legal squares array to the drop event, to sent the array it must first be converted to a JSON string
        let legalSquares = getPossibleMoves(startingSquareId, pieceObject, boardSquaresArray);
        let legalSquaresJson = JSON.stringify(legalSquares);
        ev.dataTransfer.setData("application/json", legalSquaresJson);
        
        if (highlightLegalMovesEnabled) {
            highlightLegalSquares(legalSquares);
        }
        
    } else { //wrong turn, show alert
        const alert = document.getElementById("checkAlert");
        const message = isWhiteTurn ? "It's White's turn!" : "It's Black's turn!";
        alert.innerText = message;
        alert.style.display = "block";
        setTimeout(() => {
            alert.style.display = "none";
        }, 900);
        ev.preventDefault(); //block the drag
    }
}

function drop(ev) {
    ev.preventDefault();
    clearHighlightedSquares(); //after any valid move/capture
    let data = ev.dataTransfer.getData("text");
    //drop function receives the data sent from the drag function
    let [pieceId, startingSquareId] = data.split("|");
    let legalSquaresJson = ev.dataTransfer.getData("application/json");
    if (legalSquaresJson.length==0) return;
    let legalSquares = JSON.parse(legalSquaresJson); //get the full list of legal squares

    const piece = document.getElementById(pieceId);
    piece.classList.remove("dragging");
    const pieceColor = piece.getAttribute("color");
    const pieceType = piece.classList[1];
    const destinationSquare = ev.currentTarget;
    let destinationSquareId = destinationSquare.id;
    let squareContent = getPieceAtSquare(destinationSquareId, boardSquaresArray); //old isSquareOccupied function was replaced with the new getPieceAtSquare function

    if (destinationSquareId === startingSquareId) return; // early exit to prevent going through the validation code that follows, if the piece was dropped back to its initial square
    if (squareContent.pieceColor === pieceColor) return; // early exit to ignore drops onto squares occupied by same-color pieces

    //filter out legal squares that would put the king in check (illegal moves based on check rules)
    //legalSquares = isMoveValidAgainstCheck(legalSquares, startingSquareId, pieceColor, pieceType);

    if (checkDetectionEnabled) {
        legalSquares = isMoveValidAgainstCheck(legalSquares, startingSquareId, pieceColor, pieceType);
    
        if (!legalSquares.includes(destinationSquareId)) {
            //notify user and block move
            const alert = document.getElementById("checkAlert");
            const message = isWhiteTurn ? "White is in Check!" : "Black is in Check!";
            alert.innerText = message;
            alert.style.display = "block";
            setTimeout(() => {
                alert.style.display = "none";
            }, 900);
            return;
        }
    }    

    if (pieceType == "king" && checkDetectionEnabled) {
        let isCheck = isKingInCheck(destinationSquareId, pieceColor, boardSquaresArray);
        if (isCheck) return;

        isWhiteTurn ? (whiteKingSquare = destinationSquareId) : (blackKingSquare = destinationSquareId);
    }

    if ((squareContent.pieceColor == "blank") && (legalSquares.includes(destinationSquareId))) { //((isSquareOccupied(destinationSquare) == "blank") && (legalSquares.includes(destinationSquareId))) {
        destinationSquare.appendChild(piece);
        isWhiteTurn = !isWhiteTurn;
        highlightActivePieces();
        // legalSquares.length = 0;
        //after making each move on the chessboard, the boardSquaresArray should be updated to reflect the changes
        updateBoardSquaresArray(startingSquareId, destinationSquareId, boardSquaresArray);
        checkForCheckmate(); //check for checkmate after each move
        return;
    }

    if ((squareContent.pieceColor != "blank") && (legalSquares.includes(destinationSquareId))) { //((isSquareOccupied(destinationSquare) != "blank") && (legalSquares.includes(destinationSquareId))) {
        //capture logic
        const capturedColor = squareContent.pieceColor;
        const capturedType = squareContent.pieceType;

        while(destinationSquare.firstChild) {
            destinationSquare.removeChild(destinationSquare.firstChild);
        }
        destinationSquare.appendChild(piece);
        isWhiteTurn = !isWhiteTurn;
        highlightActivePieces();
        // legalSquares.length = 0;

        //create an <img> for the captured piece
        const img = document.createElement("img");
        img.src = `pieces/${capturedType}-${capturedColor}.png`;
        img.width = 40;
        img.height = 40;
    
        if (capturedColor === "white") {
            document.getElementById("captured-black").appendChild(img);
        } else {
            document.getElementById("captured-white").appendChild(img);
        }

        //king is captured = game is over (display end game message)
        if (squareContent.pieceType === "king") {
            const alert = document.getElementById("winnerAlert");
            const winner = pieceColor === "white" ? "White Wins!" : "Black Wins!";
            alert.innerHTML = winner;
            alert.style.display = "block";

            setTimeout(function() {
                alert.style.display= "none"; 
            }, 5000); //hide message after 5 seconds
            disableAllMoves();
            return;
        }
        updateBoardSquaresArray(startingSquareId, destinationSquareId, boardSquaresArray);
        checkForCheckmate();
        return;
    }  
}

//takes startingSquareId and destinationSquareId as arguments and updates their respective objects in the boardSquaresArray after each move
//this means removing the piece from the start square and adding it to the destination square
function updateBoardSquaresArray(startingSquareId, destinationSquareId, boardSquaresArray) {
    let currentSquare = boardSquaresArray.find((element) => element.squareId === startingSquareId);
    let destinationSquareElement = boardSquaresArray.find((element) => element.squareId === destinationSquareId);
    let pieceColor = currentSquare.pieceColor;
    let pieceType = currentSquare.pieceType;
    let pieceId = currentSquare.pieceId;
    destinationSquareElement.pieceColor = pieceColor;
    destinationSquareElement.pieceType = pieceType;
    destinationSquareElement.pieceId = pieceId;
    currentSquare.pieceColor = "blank";
    currentSquare.pieceType = "blank";
    currentSquare.pieceId = "blank";
}

function getPossibleMoves(startingSquareId, piece, boardSquaresArray) { //takes a pieceObject and boardSquaresArray as arguments instead of an html element
                                                                        //this function uses the information in the pieceObject and boardSquaresArray to calculate the legal moves for the piece and return them as an array
    // const pieceColor = piece.getAttribute("color");
    const pieceColor = piece.pieceColor;
    const pieceType = piece.pieceType;
    let legalSquares = [];

    if(pieceType=="pawn") { //if (piece.classList.contains("pawn")) {
        legalSquares = getPawnMoves(startingSquareId, pieceColor, boardSquaresArray);
        return legalSquares;
    }
    if (pieceType=="knight") {
        legalSquares = getKnightMoves(startingSquareId, pieceColor, boardSquaresArray);
        return legalSquares;
    }
    if (pieceType=="rook") {
        legalSquares = getRookMoves(startingSquareId, pieceColor, boardSquaresArray);
        return legalSquares;
    }
    if (pieceType=="bishop") {
        legalSquares = getBishopMoves(startingSquareId, pieceColor, boardSquaresArray);
        return legalSquares;
    }
    if (pieceType=="queen") {
        legalSquares = getQueenMoves(startingSquareId, pieceColor, boardSquaresArray);
        return legalSquares;
    }
    if (pieceType=="king") {
        legalSquares = getKingMoves(startingSquareId, pieceColor, boardSquaresArray);
        return legalSquares;
    }
}

// function isSquareOccupied(square) {
//     if (square.querySelector(".piece")) {
//         const color = square.querySelector(".piece").getAttribute("color");
//         return color;
//     } else {
//         return "blank";
//     }
// }

//changed the isSquareOccupied function so that it takes two arguments: squareId and boardSquaresArray. The function should return an object containing the properties
//of the piece occupying the square with the given squareId on the chessboard represented by the boardSquaresArray array
function getPieceAtSquare(squareId, boardSquaresArray) {
    //first find the object in the boardSquaresArray that represents the square with the given squareId
    //then extract the properties of the piece occupying that square from the object and return them as an object
    let currentSquare = boardSquaresArray.find((element) => element.squareId === squareId);
    const color = currentSquare.pieceColor;
    const pieceType = currentSquare.pieceType;
    const pieceId = currentSquare.pieceId;
    return {pieceColor:color, pieceType:pieceType, pieceId:pieceId};
}

function getPawnMoves(startingSquareId, pieceColor, boardSquaresArray) {
    let diagonalSquares = checkPawnDiagonalCaptures(startingSquareId, pieceColor, boardSquaresArray);
    let forwardSquares = checkPawnForwardMoves(startingSquareId, pieceColor, boardSquaresArray);
    let legalSquares = [...diagonalSquares, ...forwardSquares];
    return legalSquares;
}

//all the functions that calculate legal moves should take boardSquaresArray as an argument, and then get square information from that array instead of searching the html document
//+instead of just modifying global variable 'legalSquares', these functions should return legalSquares as their output
function checkPawnDiagonalCaptures(startingSquareId, pieceColor, boardSquaresArray) {
    const file = startingSquareId.charAt(0);
    const rank = startingSquareId.charAt(1);
    const rankNumber = parseInt(rank);
    let currentFile = file;
    let currentRank = rankNumber;
    let currentSquareId = currentFile + currentRank;
    // let currentSquare = document.getElementById(currentSquareId);
    // let squareContent = isSquareOccupied(currentSquare);
    let legalSquares = [];
    const direction = pieceColor=="white" ? 1 : -1;

    //check diagonal captures
    currentRank += direction;
    for (let i=-1; i<=1; i+=2) {
        currentFile = String.fromCharCode(file.charCodeAt(0)+i);
        if (currentFile >= "a" && currentFile <= "h") {
            currentSquareId = currentFile+currentRank;
            // currentSquare = document.getElementById(currentSquareId);
            // squareContent = isSquareOccupied(currentSquare);
            let currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
            const squareContent = currentSquare.pieceColor;
            if (squareContent != "blank" && squareContent != pieceColor)
                legalSquares.push(currentSquareId);
        }
    }
    return legalSquares;
}

//The function first checks the square directly in front of the pawn. If it is not a legal move, there are no other legal moves for the pawn
//if it is a legal move, the square is added to the legalSquares array. Then, if the pawn is on the 2nd of 7th rank, the function checks the second square in front of the pawn.
function checkPawnForwardMoves(startingSquareId, pieceColor, boardSquaresArray) {
    const file = startingSquareId.charAt(0);
    const rank = startingSquareId.charAt(1);
    const rankNumber = parseInt(rank);
    let currentFile = file;
    let currentRank = rankNumber;
    let currentSquareId = currentFile + currentRank;
    // let currentSquare = document.getElementById(currentSquareId);
    // let squareContent = isSquareOccupied(currentSquare);
    let legalSquares = [];
    const direction = pieceColor=="white" ? 1 : -1;
    currentRank += direction;

    //check one square forward
    currentSquareId = currentFile+currentRank;
    // currentSquare = document.getElementById(currentSquareId);
    // squareContent = isSquareOccupied(currentSquare);
    let currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
    let squareContent = currentSquare.pieceColor;
    if (squareContent != "blank") 
        return legalSquares;
    legalSquares.push(currentSquareId);

    //check two square forward
    if (rankNumber != 2 && rankNumber !=7) 
        return legalSquares;

    currentRank += direction;
    currentSquareId = currentFile+currentRank;
    // currentSquare = document.getElementById(currentSquareId);
    // squareContent = isSquareOccupied(currentSquare);
    currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
    squareContent = currentSquare.pieceColor;
    if (squareContent != "blank") 
        return legalSquares;
    legalSquares.push(currentSquareId);
    return legalSquares
}

function getKnightMoves(startingSquareId, pieceColor, boardSquaresArray) {
    const file = startingSquareId.charCodeAt(0)-97; //get the 2nd character of the string
    const rank = startingSquareId.charAt(1); //get the 2nd character of the string
    const rankNumber = parseInt(rank); //convert the 2nd character to a number
    let currentFile = file;
    let currentRank = rankNumber;
    let legalSquares = [];

    const moves = [
        [-2,1], [-1,2], [1,2], [2,1], [2,-1], [1,-2], [-1,-2], [-2,-1]
    ];

    moves.forEach((move) => {
        currentFile = file + move[0];
        currentRank = rankNumber + move[1];
        if (currentFile >= 0 && currentFile <= 7 && currentRank > 0 && currentRank <= 8) {
            let currentSquareId = String.fromCharCode(currentFile+97) + currentRank;
            // let currentSquare = document.getElementById(currentSquareId);
            // let squareContent = isSquareOccupied(currentSquare);
            let currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
            let squareContent = currentSquare.pieceColor;
            if (squareContent != "blank" && squareContent == pieceColor) 
                return legalSquares;
            legalSquares.push(String.fromCharCode(currentFile+97) + currentRank);
        }
    });
    return legalSquares;
}

function getRookMoves(startingSquareId, pieceColor, boardSquaresArray) {
    let moveToEighthRankSquares = moveToEighthRank(startingSquareId, pieceColor, boardSquaresArray);
    let moveToFirstRankSquares = moveToFirstRank(startingSquareId, pieceColor, boardSquaresArray);
    let moveToAFileSquares = moveToAFile(startingSquareId, pieceColor, boardSquaresArray);
    let moveToHFileSquares = moveToHFile(startingSquareId, pieceColor, boardSquaresArray);
    let legalSquares = [...moveToEighthRankSquares, ...moveToFirstRankSquares, ...moveToAFileSquares, ...moveToHFileSquares];
    return legalSquares;
}

function moveToEighthRank(startingSquareId, pieceColor, boardSquaresArray) {
    const file = startingSquareId.charAt(0);
    const rank = startingSquareId.charAt(1);
    const rankNumber = parseInt(rank);
    let currentRank = rankNumber;
    let legalSquares = [];

    while(currentRank != 8) {
        currentRank++;
        let currentSquareId = file + currentRank;
        // let currentSquare = document.getElementById(currentSquareId);
        // let squareContent = isSquareOccupied(currentSquare);
        let currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
        let squareContent = currentSquare.pieceColor;
        if (squareContent != "blank" && squareContent == pieceColor) 
            return legalSquares;
        legalSquares.push(currentSquareId);
        if (squareContent != "blank" && squareContent != pieceColor) 
            return legalSquares;
    }
    return legalSquares;
}

function moveToFirstRank(startingSquareId, pieceColor, boardSquaresArray) {
    const file = startingSquareId.charAt(0);
    const rank = startingSquareId.charAt(1);
    const rankNumber = parseInt(rank);
    let currentRank = rankNumber;
    let legalSquares = [];

    while(currentRank != 1) {
        currentRank--;
        let currentSquareId = file + currentRank;
        // let currentSquare = document.getElementById(currentSquareId);
        // let squareContent = isSquareOccupied(currentSquare);
        let currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
        let squareContent = currentSquare.pieceColor;
        if (squareContent != "blank" && squareContent == pieceColor) 
            return legalSquares;
        legalSquares.push(currentSquareId);
        if (squareContent != "blank" && squareContent != pieceColor) 
            return legalSquares;
    }
    return legalSquares;
}

function moveToAFile(startingSquareId, pieceColor, boardSquaresArray) {
    const file = startingSquareId.charAt(0);
    const rank = startingSquareId.charAt(1);
    const rankNumber = parseInt(rank);
    let currentFile = file;
    let legalSquares = [];

    while(currentFile != "a") {
        currentFile = String.fromCharCode(currentFile.charCodeAt(currentFile.length-1)-1);
        let currentSquareId = currentFile + rank;
        // let currentSquare = document.getElementById(currentSquareId);
        // let squareContent = isSquareOccupied(currentSquare);
        let currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
        let squareContent = currentSquare.pieceColor;

        if (squareContent != "blank" && squareContent == pieceColor) 
            return legalSquares;
        legalSquares.push(currentSquareId);
        if (squareContent != "blank" && squareContent != pieceColor) 
            return legalSquares;
    }
    return legalSquares;
}

function moveToHFile(startingSquareId, pieceColor, boardSquaresArray) {
    const file = startingSquareId.charAt(0);
    const rank = startingSquareId.charAt(1);
    const rankNumber = parseInt(rank);
    let currentFile = file;
    let legalSquares = [];

    while(currentFile != "h") {
        currentFile = String.fromCharCode(currentFile.charCodeAt(currentFile.length-1)+1);
        let currentSquareId = currentFile + rank;
        // let currentSquare = document.getElementById(currentSquareId);
        // let squareContent = isSquareOccupied(currentSquare);
        let currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
        let squareContent = currentSquare.pieceColor;

        if (squareContent != "blank" && squareContent == pieceColor) 
            return legalSquares;
        legalSquares.push(currentSquareId);
        if (squareContent != "blank" && squareContent != pieceColor) 
            return legalSquares;
    }
    return legalSquares;
}

function getBishopMoves(startingSquareId, pieceColor, boardSquaresArray) {
    let moveToEighthRankAFileSquares = moveToEighthRankAFile(startingSquareId, pieceColor, boardSquaresArray);
    let moveToEighthRankHFileSquares = moveToEighthRankHFile(startingSquareId, pieceColor, boardSquaresArray);
    let moveToFirstRankAFileSquares = moveToFirstRankAFile(startingSquareId, pieceColor, boardSquaresArray);
    let moveToFirstRankHFileSquares = moveToFirstRankHFile(startingSquareId, pieceColor, boardSquaresArray);
    let legalSquares = [...moveToEighthRankAFileSquares, ...moveToEighthRankHFileSquares, ...moveToFirstRankAFileSquares, ...moveToFirstRankHFileSquares];
    return legalSquares;
}

function moveToEighthRankAFile(startingSquareId, pieceColor, boardSquaresArray) {
    const file = startingSquareId.charAt(0);
    const rank = startingSquareId.charAt(1);
    const rankNumber = parseInt(rank);
    let currentFile = file;
    let currentRank = rankNumber;
    let legalSquares = [];

    while(!(currentFile == "a" || currentRank == 8)) {
        currentFile = String.fromCharCode(currentFile.charCodeAt(currentFile.length-1)-1);
        currentRank++;
        let currentSquareId = currentFile + currentRank;
        // let currentSquare = document.getElementById(currentSquareId);
        // let squareContent = isSquareOccupied(currentSquare);
        let currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
        let squareContent = currentSquare.pieceColor;

        if (squareContent != "blank" && squareContent == pieceColor) 
            return legalSquares;
        legalSquares.push(currentSquareId);
        if(squareContent != "blank" && squareContent != pieceColor) 
            return legalSquares;
    }
    return legalSquares;
}

function moveToEighthRankHFile(startingSquareId, pieceColor, boardSquaresArray) {
    const file = startingSquareId.charAt(0);
    const rank = startingSquareId.charAt(1);
    const rankNumber = parseInt(rank);
    let currentFile = file;
    let currentRank = rankNumber;
    let legalSquares = [];

    while(!(currentFile == "h" || currentRank == 8)) {
        currentFile = String.fromCharCode(currentFile.charCodeAt(currentFile.length-1)+1);
        currentRank++;
        let currentSquareId = currentFile + currentRank;
        // let currentSquare = document.getElementById(currentSquareId);
        // let squareContent = isSquareOccupied(currentSquare);
        let currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
        let squareContent = currentSquare.pieceColor;

        if (squareContent != "blank" && squareContent == pieceColor) 
            return legalSquares;
        legalSquares.push(currentSquareId);
        if(squareContent != "blank" && squareContent != pieceColor) 
            return legalSquares;
    }
    return legalSquares;
}

function moveToFirstRankAFile(startingSquareId, pieceColor, boardSquaresArray) {
    const file = startingSquareId.charAt(0);
    const rank = startingSquareId.charAt(1);
    const rankNumber = parseInt(rank);
    let currentFile = file;
    let currentRank = rankNumber;
    let legalSquares = [];

    while(!(currentFile == "a" || currentRank == 1)) {
        currentFile = String.fromCharCode(currentFile.charCodeAt(currentFile.length-1)-1);
        currentRank--;
        let currentSquareId = currentFile + currentRank;
        // let currentSquare = document.getElementById(currentSquareId);
        // let squareContent = isSquareOccupied(currentSquare);
        let currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
        let squareContent = currentSquare.pieceColor;

        if (squareContent != "blank" && squareContent == pieceColor) 
            return legalSquares;
        legalSquares.push(currentSquareId);
        if(squareContent != "blank" && squareContent != pieceColor) 
            return legalSquares;
    }
    return legalSquares;
}

function moveToFirstRankHFile(startingSquareId, pieceColor, boardSquaresArray) {
    const file = startingSquareId.charAt(0);
    const rank = startingSquareId.charAt(1);
    const rankNumber = parseInt(rank);
    let currentFile = file;
    let currentRank = rankNumber;
    let legalSquares = [];

    while(!(currentFile == "h" || currentRank == 1)) {
        currentFile = String.fromCharCode(currentFile.charCodeAt(currentFile.length-1)+1);
        currentRank--;
        let currentSquareId = currentFile + currentRank;
        // let currentSquare = document.getElementById(currentSquareId);
        // let squareContent = isSquareOccupied(currentSquare);
        let currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
        let squareContent = currentSquare.pieceColor;

        if (squareContent != "blank" && squareContent == pieceColor) 
            return legalSquares;
        legalSquares.push(currentSquareId);
        if(squareContent != "blank" && squareContent != pieceColor) 
            return legalSquares;
    }
    return legalSquares;
}

function getQueenMoves(startingSquareId, pieceColor, boardSquaresArray) {
    //all the bishop moves
    let bishopMoves = getBishopMoves(startingSquareId, pieceColor, boardSquaresArray);

    //all the rook moves
    let rookMoves = getRookMoves(startingSquareId, pieceColor, boardSquaresArray);

    let legalSquares = [...bishopMoves, ...rookMoves];
    return legalSquares;
}

function getKingMoves(startingSquareId, pieceColor, boardSquaresArray) {
    const file = startingSquareId.charCodeAt(0)-97;
    const rank = startingSquareId.charAt(1);
    const rankNumber = parseInt(rank);
    let currentFile = file;
    let currentRank = rankNumber;
    let legalSquares = [];

    const moves = [
        [0,1], [0,-1], [1,1], [1,-1], [-1,0], [-1,-1], [-1,1], [1,0]
    ];

    moves.forEach((move) => {
        currentFile = file + move[0];
        currentRank = rankNumber + move[1];
        if (currentFile >= 0 && currentFile <= 7 && currentRank > 0 && currentRank <= 8) {
            let currentSquareId = String.fromCharCode(currentFile+97) + currentRank;
            // let currentSquare = document.getElementById(currentSquareId);
            // let squareContent = isSquareOccupied(currentSquare);
            let currentSquare = boardSquaresArray.find((element) => element.squareId === currentSquareId);
            let squareContent = currentSquare.pieceColor;

            if (squareContent != "blank" && squareContent == pieceColor) 
                return legalSquares;
            legalSquares.push(String.fromCharCode(currentFile+97) + currentRank);
        }
    });
    return legalSquares
}

//this function receives a squareId and pieceColor as arguments and checks if the king of the given color would be in check if it were on the square with the given squareId
function isKingInCheck(squareId, pieceColor, boardSquaresArray) {
    //to check if the king is in check, assume that a piece is in the king's place and find all legal squares for it
    //if any of these legal squares contain a piece of the same type but opposite color it means that the piece can attack the square where the king is placed
    let legalSquares = getRookMoves(squareId, pieceColor, boardSquaresArray);
    for (let squareId of legalSquares) {
        let pieceProperties = getPieceAtSquare(squareId, boardSquaresArray);
        if ((pieceProperties.pieceType == "rook" || pieceProperties.pieceType == "queen") && pieceColor != pieceProperties.pieceColor)
            return true;
    }
    
    legalSquares = getBishopMoves(squareId, pieceColor, boardSquaresArray);
    for (let squareId of legalSquares) {
        let pieceProperties = getPieceAtSquare(squareId, boardSquaresArray);
        if ((pieceProperties.pieceType == "bishop" || pieceProperties.pieceType == "queen") && pieceColor != pieceProperties.pieceColor)
            return true;
    }

    legalSquares = checkPawnDiagonalCaptures(squareId, pieceColor, boardSquaresArray);
    for (let squareId of legalSquares) {
        let pieceProperties = getPieceAtSquare(squareId, boardSquaresArray);
        if ((pieceProperties.pieceType == "pawn") && pieceColor != pieceProperties.pieceColor)
            return true;
    }

    legalSquares = getKnightMoves(squareId, pieceColor, boardSquaresArray);
    for (let squareId of legalSquares) {
        let pieceProperties = getPieceAtSquare(squareId, boardSquaresArray);
        if ((pieceProperties.pieceType == "knight") && pieceColor != pieceProperties.pieceColor)
            return true;
    }

    legalSquares = getKingMoves(squareId, pieceColor, boardSquaresArray);
    for (let squareId of legalSquares) {
        let pieceProperties = getPieceAtSquare(squareId, boardSquaresArray);
        if ((pieceProperties.pieceType == "king") && pieceColor != pieceProperties.pieceColor)
            return true;
    }

    return false;
}

//takes a piece type, color, its starting square and the legal squares for it
//for each move it checks if playing those legal moves would put the king in check by playing them on a copy of the boardSquaresArray
//if a move puts the king in check, it is filtered out
function isMoveValidAgainstCheck(legalSquares, startingSquareId, pieceColor, pieceType) {
    let kingSquare = isWhiteTurn ? whiteKingSquare : blackKingSquare;
    let boardSquaresArrayCopy = deepCopyArray(boardSquaresArray);
    let legalSquaresCopy = legalSquares.slice();
    legalSquaresCopy.forEach((element) => {
        let destinationId = element;
        boardSquaresArrayCopy = deepCopyArray(boardSquaresArray);
        updateBoardSquaresArray(startingSquareId, destinationId, boardSquaresArrayCopy);
        if(pieceType != "king" && isKingInCheck(kingSquare, pieceColor, boardSquaresArrayCopy)) {
            legalSquares = legalSquares.filter((item) => item != destinationId);
        }

        if(pieceType == "king" && isKingInCheck(destinationId, pieceColor, boardSquaresArrayCopy)) {
            legalSquares = legalSquares.filter((item) => item != destinationId);
        }
    });

    return legalSquares;
}

//checkmate function that determines if there are no legal moves for all pieces on one side
//if no legal moves are found, the function concludes that it is checkmate
function checkForCheckmate() {
    let kingSquare = isWhiteTurn ? whiteKingSquare : blackKingSquare;
    let pieceColor = isWhiteTurn ? "white" : "black";
    let boardSquaresArrayCopy = deepCopyArray(boardSquaresArray);
    let kingIsCheck = isKingInCheck(kingSquare, pieceColor, boardSquaresArrayCopy);
    if (!kingIsCheck) return;
    highlightCheckedKing();
    let possibleMoves = getAllPossibleMoves(boardSquaresArrayCopy, pieceColor);
    if (possibleMoves.length > 0) return;

    //to display an end game message
    const alert = document.getElementById("winnerAlert");
    const message = isWhiteTurn ? "Checkmate; Black Wins!" : "Checkmate; White Wins!";
    alert.innerHTML = message;
    alert.style.display = "block";

    setTimeout(function() {
        alert.style.display= "none"; 
    }, 5000); //hide message after 5 seconds
}

// function highlightCheckedKing() {
//     if (!checkDetectionEnabled) return;

//     const color = isWhiteTurn ? "white" : "black";
//     const kingSquareId = isWhiteTurn ? whiteKingSquare : blackKingSquare;
//     const kingSquare = document.getElementById(kingSquareId);

//     //highlight the square
//     kingSquare.classList.add("check-highlight");

//     //highlight the piece
//     const kingPiece = kingSquare.querySelector(".piece");
//     if (kingPiece) kingPiece.classList.add("check-highlight");
// }

// function clearCheckHighlights() {
//     document.querySelectorAll(".check-highlight").forEach(el => el.classList.remove("check-highlight"));
// }

//finds all legal moves for every piece on one side and stores the results in an array
function getAllPossibleMoves(squaresArray, color) {
    return squaresArray.filter((square) => square.pieceColor === color).flatMap((square) => {
        const {pieceColor, pieceType, pieceId} = getPieceAtSquare(square.squareId, squaresArray);
        if (pieceId === "blank") return [];
        let squaresArrayCopy = deepCopyArray(squaresArray);
        const pieceObject = {pieceColor: pieceColor, pieceType: pieceType, pieceId: pieceId};
        let legalSquares = getPossibleMoves(square.squareId, pieceObject, squaresArrayCopy);
        legalSquares = isMoveValidAgainstCheck(legalSquares, square.squareId, pieceColor, pieceType);
        return legalSquares;
    });
}

function disableAllMoves() {
    for (let piece of document.getElementsByClassName("piece")) {
        piece.setAttribute("draggable", false);
    }
}

function highlightLegalSquares(squares) {
    clearHighlightedSquares();
    squares.forEach(squareId => {
        const square = document.getElementById(squareId);
        square.classList.add("legal-highlight");
    });
}

function clearHighlightedSquares() {
    for (let square of boardSquares) {
        square.classList.remove("legal-highlight");
    }
}
