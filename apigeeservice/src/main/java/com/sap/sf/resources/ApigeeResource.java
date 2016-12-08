package com.sap.sf.resources;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;

import com.codahale.metrics.annotation.Timed;
import com.sap.sf.api.Saying;

@Path("/apigee")
@Produces(MediaType.APPLICATION_JSON)
public class ApigeeResource {
  private final String template;
  private final String defaultName;
  private final AtomicLong counter;
  private HttpClientApigee apigee = null;
  
  public ApigeeResource(String template, String defaultName) {
    this.template = template;
    this.defaultName = defaultName;
    this.counter = new AtomicLong();
    apigee = new HttpClientApigee();
  }

  @GET
  @Timed
  public Saying sayHello(@QueryParam("dc") String dc, @QueryParam("timerange") String timeRange, @QueryParam("timeunit") String timeUnit) {
    final String value = apigee.doExecute(dc, timeRange, timeUnit);
    return new Saying(counter.incrementAndGet(), value);
  }
}
