var tlvjs = {};

tlvjs.hexToBytes = function (hex) {
    for (var bytes = [], c = 0; c < hex.length; c += 2)
        bytes.push(parseInt(hex.substr(c, 2), 16));
    return bytes;
}

tlvjs.bytesToHex = function (bytes) {
    for (var hex = [], i = 0; i < bytes.length; i++) {
        var current = bytes[i] < 0 ? bytes[i] + 256 : bytes[i];
        hex.push((current >>> 4).toString(16));
        hex.push((current & 0xF).toString(16));
    }
    return hex.join("");
}

tlvjs.parseTag = function (buf) {
    var index = 0;
    var tag = buf[index++];
    var tagLength = 1;

    while(tag == 0x00 || tag == 0xff) {
        tag = buf[index++];
    }

    var constructed = (tag & 0x20) == 0x20;

    if ((tag & 0x1F) == 0x1F) {
        do {
            tag = tag << 8;
            tag = tag | buf[index++];
            tagLength++;
        } while((tag & 0x80) == 0x80);

        if (tagLength > 4) {
            throw new RangeError("The length of the tag cannot be more than 4 bytes in this implementation");
        }
    }
    return { tag: tag, length: index, constructed: constructed };
}
