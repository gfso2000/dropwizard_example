package com.sap.sf.resources;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.http.HttpHost;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.config.CookieSpecs;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.client.entity.UrlEncodedFormEntity;
import org.apache.http.client.methods.HttpGet;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.impl.conn.DefaultProxyRoutePlanner;
import org.apache.http.message.BasicNameValuePair;
import org.json.JSONArray;
import org.json.JSONObject;

public class HttpClientApigee {
  private Map<String, HttpClientWrapper> apigeeClientMap = new HashMap<String, HttpClientWrapper>();
  private ExecutorService executorService = null;
  
  public HttpClientApigee() {
    //DC13
    ApigeeConfig config = new ApigeeConfig();
    config.setLoginUrl("https://apigeedc13-13vm.sflab.ondemand.com/login");
    config.setDataBaseUrl("https://apigeedc13-13vm.sflab.ondemand.com/ws/proxy/organizations/apimgmtprdzdc13/environments/qacandtest/stats/apiproxy?_optimized=js&limit=14400&select=sum(message_count),sum(is_error)");
    config.setUsername("jack.yu05@sap.com");
    config.setPassword("Password1");
    config.setProxyName("BizXAPIServer-ApiProxy");
    apigeeClientMap.put("DC13", new HttpClientWrapper(config));
    //DC8
    config = new ApigeeConfig();
    config.setLoginUrl("https://apimgmt8.sapsf.com/login");
    config.setDataBaseUrl("https://apimgmt8.sapsf.com/ws/proxy/organizations/hcmpreview/environments/previewash/stats/apis?_optimized=js&limit=14400&select=sum(message_count),sum(is_error)");
    config.setUsername("jack.yu05@sap.com");
    config.setPassword("Password1$");
    config.setProxyName("BizXAPIServer-ApiProxy");
    apigeeClientMap.put("DC8", new HttpClientWrapper(config));
    
    executorService = Executors.newFixedThreadPool(apigeeClientMap.size());
  }
  
  public String getDCList(){
    StringBuffer sb = new StringBuffer("");
    Iterator<String> i = apigeeClientMap.keySet().iterator();
    while(i.hasNext()) {
      String key = i.next();
      sb.append(key+";");
    }
    return sb.toString();
  }
  public String doExecute(String dc, String timeRange, String timeUnit) {
    Future<APIResult> result = executorService.submit(new GetDataThread(dc, timeRange, timeUnit));
    try {
      APIResult data = result.get(60, TimeUnit.SECONDS);
      if(data.hasError) {
        //handle error resp
        return "error:"+data.getErrorMessage();
      } else {
        return data.getData();
      }
    } catch (Exception e) {
      // interrupts if there is any possible error
      result.cancel(true);
      return e.getMessage();
    }
  }
  
  private class GetDataThread implements Callable<APIResult> {
    private String dc;
    private String timeRange;
    private String timeUnit;
    public GetDataThread(String dc, String timeRange, String timeUnit) {
      this.dc = dc;
      this.timeRange = timeRange;
      this.timeUnit = timeUnit;
    }
    @Override
    public APIResult call() throws Exception {
      HttpClientWrapper client = apigeeClientMap.get(dc);
      APIResult data = client.getData(timeRange, timeUnit);
      return data;
    }
  }

  private class ApigeeConfig {
    private String loginUrl = null;
    private String dataBaseUrl = null;
    private String username = null;
    private String password = null;
    private String proxyName = null;
    
    public String getLoginUrl() {
      return loginUrl;
    }
    public void setLoginUrl(String loginUrl) {
      this.loginUrl = loginUrl;
    }
    public String getDataBaseUrl() {
      return dataBaseUrl;
    }
    public void setDataBaseUrl(String dataBaseUrl) {
      this.dataBaseUrl = dataBaseUrl;
    }
    public String getUsername() {
      return username;
    }
    public void setUsername(String username) {
      this.username = username;
    }
    public String getPassword() {
      return password;
    }
    public void setPassword(String password) {
      this.password = password;
    }
    public String getProxyName() {
      return proxyName;
    }
    public void setProxyName(String proxyName) {
      this.proxyName = proxyName;
    }
  }
  
  private class APIResult {
    private boolean hasError;
    private String errorMessage;
    private String data;
    public boolean isHasError() {
      return hasError;
    }
    public void setHasError(boolean hasError) {
      this.hasError = hasError;
    }
    public String getErrorMessage() {
      return errorMessage;
    }
    public void setErrorMessage(String errorMessage) {
      this.errorMessage = errorMessage;
    }
    public String getData() {
      return data;
    }
    public void setData(String data) {
      this.data = data;
    }
  }
  
  private class HttpClientWrapper {
    private String proxyUrl = null;
    private int proxyPort = 0;
    private String loginUrl = null;
    private String getDataBaseUrl = null;
    private String username = null;
    private String password = null;
    private String proxyName = null;
    
    private HttpClient client = null;
    
    public HttpClientWrapper(ApigeeConfig config) {
      proxyUrl = "proxy";
      proxyPort = 8080;
      loginUrl = config.getLoginUrl();
      getDataBaseUrl = config.getDataBaseUrl();
      username = config.getUsername();
      password = config.getPassword();
      proxyName = config.getProxyName();
    }
    
    public APIResult getData(String timeRange, String timeUnit) {
      APIResult result = new APIResult();
      try{
        String data = doGetData(timeRange, timeUnit);
        result.setData(data);;
        result.setHasError(false);
      }catch(Exception e){
        //only try one more time, so we need a new client object
        client = null;
        try{
          String data = doGetData(timeRange, timeUnit);
          result.setData(data);;
          result.setHasError(false);
        }catch(Exception e2){
          result.setHasError(true);;
          result.setErrorMessage(e2.getMessage());
        }
      }
      return result;
    }
    
    public String doGetData(String timeRange, String timeUnit) throws Exception{
      if(client == null) {
        //because we're behind SAP proxy, so create HttpClient with proxy setting
        //important!!!, if not set to "STANDARD", the cookie is not kept in context, then never login successfully
        RequestConfig globalConfig = RequestConfig.custom().setCookieSpec(CookieSpecs.STANDARD).build();
        if(proxyUrl != null && !proxyUrl.trim().equals("")) {
          HttpHost proxy = new HttpHost(proxyUrl, proxyPort);
          DefaultProxyRoutePlanner routePlanner = new DefaultProxyRoutePlanner(proxy);
          client = HttpClients.custom().setDefaultRequestConfig(globalConfig).setRoutePlanner(routePlanner).build();
        } else {
          client = HttpClients.custom().setDefaultRequestConfig(globalConfig).build();
        }
        
        //get csrf Token. Because in login page, there's a hidden input, which contains a csrf token, we should send it back to apigee server
        HttpGet request = new HttpGet(loginUrl);
        HttpResponse response = client.execute(request/*,httpContext*/);
        BufferedReader rd = new BufferedReader(new InputStreamReader(response.getEntity().getContent()));
        StringBuffer result = new StringBuffer();
        String line = "";
        String csrfToken = null;
        while ((line = rd.readLine()) != null) {
          if (line.indexOf("csrfToken") >= 0) {
            Pattern pattern = Pattern.compile("value=\"(.*?)\"");
            Matcher matcher = pattern.matcher(line);
            if (matcher.find()) {
              csrfToken = matcher.group(1);
            }
          }
        }
        rd.close();
        System.err.println("got csrfToken:"+csrfToken);
        
        //now login using username, password, csrftoken
        List params = new ArrayList();
        params.add(new BasicNameValuePair("username", username));
        params.add(new BasicNameValuePair("password", password));
        params.add(new BasicNameValuePair("csrfToken", csrfToken));
        HttpPost post = new HttpPost(loginUrl);
        post.setEntity(new UrlEncodedFormEntity(params));
        response = client.execute(post/*, httpContext*/);
      }
      
      String timeUrl = "&timeRange="+timeRange.replaceAll(" ", "+")+"&timeUnit="+timeUnit;
      String getDataUrl2 =  getDataBaseUrl+timeUrl;

      HttpGet request2 = new HttpGet(getDataUrl2);
      HttpResponse response2 = client.execute(request2/*,httpContext*/);
      BufferedReader rd2 = new BufferedReader(new InputStreamReader(response2.getEntity().getContent()));
      StringBuffer result2 = new StringBuffer();
      String line2 = "";
      while ((line2 = rd2.readLine()) != null) {
        result2.append(line2);
      }
      rd2.close();
      
      //now we got the data from apigee server, reconstruct the data
      JSONObject chartResult = reOrgResult(result2.toString(), proxyName);
      JSONArray tableResult = summaryResult(result2.toString(), proxyName);
      
      JSONObject result = new JSONObject();
      result.put("chart", chartResult);
      result.put("table", tableResult);
      result.put("url", getDataUrl2);
      return result.toString();
    }

    /**
     * User:
        [
        {timeUnit:111, sumOfTraffic:1111,...},
        {timeUnit:222, sumOfTraffic:2222,...},
        {timeUnit:333, sumOfTraffic:3333,...},
        {}
        ],
      EmpJob:
        [
        {timeUnit:111, sumOfTraffic:1111,...},
        {timeUnit:222, sumOfTraffic:2222,...},
        {timeUnit:333, sumOfTraffic:3333,...},
        {}
        ]
     * @param resultStr
     * @return
     * @throws ParseException
     */
    public JSONObject reOrgResult(String resultStr, String proxyName) throws ParseException {
      JSONObject jsonObj = new JSONObject(resultStr);
      JSONObject result = new JSONObject();
      
      JSONArray timeUnitArray = jsonObj.getJSONObject("Response").getJSONArray("TimeUnit");
      JSONArray dataArray = jsonObj.getJSONObject("Response").getJSONObject("stats").getJSONArray("data");
      for(int i=0;i<dataArray.length();i++) {
        JSONObject data= (JSONObject)dataArray.get(i);
        String oneEntityName = (String)data.getJSONObject("identifier").getJSONArray("values").get(0);
        
        if(proxyName != null) {
          //we're handling all companies' data, we only need the target company's data
          if(!proxyName.equalsIgnoreCase(oneEntityName)) {
            continue;
          }else{
            oneEntityName = "ALL";
          }
        }
        
        JSONArray entityStatsArray = new JSONArray();
        for(int j=0;j<timeUnitArray.length();j++) {
          JSONObject entityStats = new JSONObject();
          entityStats.put("timeUnit", timeUnitArray.getLong(j));
          
          JSONArray metricArray =  data.getJSONArray("metric");
          for(int k=0;k<metricArray.length();k++) {
            JSONObject metric= (JSONObject)metricArray.get(k);
            String name = metric.getString("name");
            name = getMetricName(name);
            if(name == null) {
              continue;
            }
            double value = metric.getJSONArray("values").getDouble(j);
            entityStats.put(name, value);
          }
          entityStatsArray.put(entityStats);
        }
        result.put(oneEntityName, entityStatsArray);
      }
      return result;
    }
    
    /**
     * combine multiple timeUnit values into one record
     * @param entityName
     * @param resultStr
     * @return
     * @throws ParseException
     */
    public JSONArray summaryResult(String resultStr, String proxyName) throws ParseException {
      JSONObject jsonObj = new JSONObject(resultStr);

      JSONArray array = new JSONArray();
      JSONArray dataArray = jsonObj.getJSONObject("Response").getJSONObject("stats").getJSONArray("data");
      for(int i=0;i<dataArray.length();i++) {
        JSONObject item = new JSONObject();
        JSONObject data= (JSONObject)dataArray.get(i);
        String oneEntityName = (String)data.getJSONObject("identifier").getJSONArray("values").get(0);
        
        if(proxyName != null) {
          //we're handling all companies' data, we only need the target company's data
          if(!proxyName.equalsIgnoreCase(oneEntityName)) {
            continue;
          }else{
            oneEntityName = "ALL";
          }
        }
        
        item.put("entityName", oneEntityName);
        JSONArray metricArray =  data.getJSONArray("metric");
        
        for(int j=0;j<metricArray.length();j++) {
          JSONObject metric= (JSONObject)metricArray.get(j);
          String name = metric.getString("name");
          double value = 0;
          //map the name to ui designed name
          name = getMetricName(name);
          if(name == null) {
            continue;
          }
          JSONArray valueArray = metric.getJSONArray("values");
          for(int k=0;k<valueArray.length();k++) {
            value += valueArray.getInt(k);
          }
          item.put(name, value);
        }
        array.put(item);
      }
      return array;
    }

    public String getMetricName(String rawName) {
      if(rawName.equalsIgnoreCase("sum(message_count)")) {
        return "sumOfTraffic";
      } else if (rawName.equalsIgnoreCase("sum(is_error)")) {
        return "sumOfError";
      }
      return null;
    }
  }
  
  public static void main(String[] args) throws Exception {
    final HttpClientApigee example = new HttpClientApigee();
    for(int i=0;i<1;i++){
      final int j = i;
      Thread t = new Thread(new Runnable(){
        @Override
        public void run() {
          System.err.println("thread:"+j);
          String data = example.doExecute("DC8", "11/6/2016+16:00:00~11/9/2016+15:59:59","hour");//11/1/2016+00:00:00~11/8/2016+23:59:59
          System.out.println("thread:"+j+":data: " + data);
        }
      });
      t.start();
    }
  }
}