include "compconstant.circom";
include "pointbits.circom";
include "escalarmulany.circom";
include "escalarmulfix.circom";
include "pedersen.circom"

template EdDSAVerifier(n) {
    signal input msg[n];

    signal input A[256];
    signal input R8[256];
    signal input S[256];

    signal Ax;
    signal Ay;

    signal R8x;
    signal R8y;

    var i;

// Ensure S<Subgroup Order

    component  compConstant = CompConstant(2736030358979909402780800718157159386076813972158567259200215660948447373040);

    for (i=0; i<254; i++) {
        S[i] ==> compConstant.in[i];
    }
    compConstant.out === 0;
    S[254] === 0;
    S[255] === 0;

// Convert A to Field elements (And verify A)

    component bits2pointA = Bits2Point_Strict();

    for (i=0; i<256; i++) {
        bits2pointA.in[i] <== A[i];
    }
    Ax <== bits2pointA.out[0];
    Ay <== bits2pointA.out[1];

// Convert R8 to Field elements (And verify R8)

    component bits2pointR8 = Bits2Point_Strict();

    for (i=0; i<256; i++) {
        bits2pointR8.in[i] <== R8[i];
    }
    R8x <== bits2pointR8.out[0];
    R8y <== bits2pointR8.out[1];

// Calculate the h = H(R,A, msg)

    component hash = Pedersen2(512+n);

    for (i=0; i<256; i++) {
        hash.in[i] <== R8[i];
        hash.in[256+i] <== A[i];
    }
    for (i=0; i<n; i++) {
        hash.in[512+i] <== msg[i];
    }

    component point2bitsH = Point2Bits_Strict();
    point2bitsH.in[0] <== hash.out[0];
    point2bitsH.in[1] <== hash.out[1];

// Calculate second part of the right side:  right2 = h*8*A

    // Multiply by 8 by adding it 3 times.  This also ensure that the result is in
    // the subgroup.
    component dbl1 = BabyDbl();
    dbl1.x <== Ax;
    dbl1.y <== Ay;
    component dbl2 = BabyDbl();
    dbl2.x <== dbl1.xout;
    dbl2.y <== dbl1.yout;
    component dbl3 = BabyDbl();
    dbl3.x <== dbl2.xout;
    dbl3.y <== dbl2.yout;

    // We check that A is not zero.
    component isZero = IsZero();
    isZero.in <== dbl3.x;
    isZero.out === 0;

    component mulAny = EscalarMulAny(256);
    for (i=0; i<256; i++) {
        mulAny.e[i] <== point2bitsH.out[i];
    }
    mulAny.p[0] <== dbl3.xout;
    mulAny.p[1] <== dbl3.yout;


// Compute the right side: right =  R8 + right2

    component addRight = BabyAdd();
    addRight.x1 <== R8x;
    addRight.y1 <== R8y;
    addRight.x2 <== mulAny.out[0];
    addRight.y2 <== mulAny.out[1];

// Calculate left side of equation left = S*B8

    var BASE8 = [
        17777552123799933955779906779655732241715742912184938656739573121738514868268,
        2626589144620713026669568689430873010625803728049924121243784502389097019475
    ];
    component mulFix = EscalarMulFix(256, BASE8);
    for (i=0; i<256; i++) {
        mulFix.e[i] <== S[i];
    }

// Do the comparation left == right

    mulFix.out[0] === addRight.xout;
    mulFix.out[1] === addRight.yout;
}