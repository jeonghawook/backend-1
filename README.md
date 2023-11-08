## **[포트폴리오 봐주세요 (CLICK ME)](https://docs.google.com/presentation/d/1AgDfLG3xav2WleWC-qCbmj9ifXyqoN5FeHiNFM-FQvI/edit#slide=id.p3)**

## **트러블슈팅 SUMMARY** 
<details>
<summary>ELASTICSEARCH</summary>
 <br>
 <p>logstash를 통한 위치 색인화에 실패했을 때, Kibana Dev Tools를 사용하여 사전에 매
핑(mapping)을 수행하고 <br> 데이터를 삽입하여 색인화에 성공했습니다. <br>
아직 해결하지 못한 부분입니다. category를 인덱싱 하여 elasticsearch 사용 시
postgres 보다 시간이 더 오래 걸리는 현상이 생겼습니다. 여러 방식을 도입하였고 생각
을 해보았지만 postgres가 빠르게 나오는 건 이상한 현상이였고, 그래서 thunderclient,
혹은 vsCode 에서 시간을 확인하는 것보다 kibana dev tool 과 pgAdmin 에서 속도 측
정을 해봤습니다.
Elasticsearch가 20ms ,pgAdmin이 1초 이상이 나오면서 elasticsearch가 압도적인 모
습을 보였습니다. ELK를 다른 서버에서 관리를 해서 이런 속도가 나오는 건지 아니면
‘aws’ RDS라서 postgres가 연결이 빠르게 되서 그런 건지 network latency 문제가 맞
는 건지 계속 실험 중에 있습니다.
</p>
</details>

<details>
<summary>Redis</summary>
 <br>
 <p>
   redis cloud region 에 의한 200ms latency. cloud 서버의 거리(미국)에 따른 lateny 발
생했습니다. 확장성이 부족해지지만 elastic cache를 사용하는 비용이 더 리스크 큰 나
머지. ec2 생성해서 redis server cloud 처럼 사용했습니다. ec2는 당연히 국내region
을 사용하여 200ms latency를 없애주었습니다.
</p>
</details>
