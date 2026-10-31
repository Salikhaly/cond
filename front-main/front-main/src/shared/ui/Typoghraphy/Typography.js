import React from "react";

export function Typography({
       text='', size=16, weight=500,
       marginTop=0, marginLeft=0, marginRight=0, marginBottom=0, bottom, top,
       color, align
}) {

    marginTop = marginTop || top
    marginBottom = marginBottom || bottom

    if (!text) return;

    return (<span style={{
        marginTop,
        marginRight,
        marginLeft,
        marginBottom,
        fontSize: size,
        fontWeight: weight,
        color,
        textAlign: align
    }}>
        {text}
    </span>)
}