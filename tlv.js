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

    // length is actually parsed length, not tag length
    return { tag: tag, length: index, constructed: constructed };
}

tlvjs.parseAll = function(buf, stopOnEOC) {
    var tlvs = [];
    stopOnEOC = (stopOnEOC === undefined) ? false : stopOnEOC;

    for (var i = 0; i < buf.length; i += tlvs[tlvs.length - 1].originalLength) {
        var tlv = tlvjs.parse(buf.slice(i));
        if (stopOnEOC && tlv.tag == 0x00 && tlv.originalLength == 2) {
            break;
        }

        tlvs.push(tlv);
    }

    return tlvs;
}

tlvjs.parse = function(buf) {
    var index = 0;
    var tag = tlvjs.parseTag(buf);
    index += tag.length;

    var len = 0;
    var value;

    if (buf[index] == 0x80) {
        index++;

        if (!tag.constructed) {
            throw new Error("Only constructed TLV can have indefinite length");
        }

        value = tlvjs.parseAll(buf.slice(index), true);
        for (var i = 0; i < value.length; i++) {
            index += value[i].originalLength;
        }

        return {
            tag: tag.tag,
            value: value,
            indefiniteLength: true,
            originalLength: index + 2
        };

        // return new TLV(tag.tag, value, true, index + 2);
    } else if ((buf[index] & 0x80) == 0x80) {
        var lenOfLen = buf[index++] & 0x7F;

        if (lenOfLen > 4) {
            throw new RangeError("The length of the value cannot be represented on more than 4 bytes in this implementation");
        }

        while(lenOfLen > 0) {
            len = len | buf[index++];

            if (lenOfLen > 1) {
                len = len << 8;
            }

            lenOfLen--;
        }
    } else {
        len = buf[index++];
    }

    value = buf.slice(index, len + index);
    index += len;

    if (tag.constructed) {
        value = tlvjs.parseAll(value);
    }

    return {
        tag: tag.tag,
        value: value,
        indefiniteLength: false,
        originalLength: index
    };
    // return new TLV(tag.tag, value, false, index);
};

