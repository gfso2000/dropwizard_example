package com.sap.sf.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.hibernate.validator.constraints.Length;

public class Saying {
    private long id;

    @Length(max = 3)
    private String content;
    private String tag;
    
    public Saying() {
        // Jackson deserialization
    }

    public Saying(long id, String content, String tag) {
        this.id = id;
        this.content = content;
        this.tag = tag;
    }

    @JsonProperty
    public long getId() {
        return id;
    }

    @JsonProperty
    public String getContent() {
        return content;
    }
    @JsonProperty
    public String getTag() {
        return tag;
    }
}
