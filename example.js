const EXAMPLE_ROWS = [
 ['780','Md Rakib Hossain-186…','Puthia',18.83,9,65.24,74,'No end user visits; lead creation 45.83%, lead visit 48.33%; conversion and active carpenter 0%','',DEFAULT_ASM_FB,{eu:0,lcA:45.83,lvA:48.33,convA:0,carpA:0}],
 ['781','Md. Sohel Rana-15938','Bagha',18.5,9,81.47,81,'Lead visit 35.00%; end user visit, conversion and active carpenter 0%','',DEFAULT_ASM_FB,{eu:0,lcA:57.5,lvA:35,convA:0,carpA:0}],
 ['777','MD. Mizanur Rahman-…','Baghmara',16.5,8,80.19,81,'Lead creation 49.17%, lead visit 33.33%; conversion and active carpenter 0%','carpenter issue',DEFAULT_ASM_FB,{eu:3,lcA:49.17,lvA:33.33,convA:0,carpA:0}],
 ['1263','Md Sohel Rana','Nachole',13.33,7,60.72,69,'Lead creation 38.33%, lead visit 28.33%; conversion and active carpenter 0%','Pending user orders',DEFAULT_ASM_FB,{eu:4,lcA:38.33,lvA:28.33,convA:0,carpA:0}],
 ['783','MD. Emran Hossain-01…','Mohonpur',12.5,6,48.97,67,'No end user visits; lead visit 10.00%; conversion and active carpenter 0%','Pending user orders; carpenter bKash payment problem',DEFAULT_ASM_FB,{eu:0,lcA:52.5,lvA:10,convA:0,carpA:0}],
 ['1273','Md. Hossen Ali','Gomostapur',12.5,6,40.27,59,'Lead visit 13.33%; end user visit, conversion and active carpenter 0%','Pending user orders; carpenter bKash payment problem',DEFAULT_ASM_FB,{eu:0,lcA:60,lvA:13.33,convA:0,carpA:0}],
 ['785','Md. Arifuzzaman Arif-…','Chapai Nawabganj','10.00'*1,5,19.72,23,'Only 1 end user visit; lead creation 36.67%, lead visit 13.33%','Pending user orders',DEFAULT_ASM_FB,{eu:1,lcA:36.67,lvA:13.33,convA:0,carpA:0}],
 ['782','Kowshik Kumar Sarkar-…','Rajshahi Sadar',4.83,2,2.52,2,'Lead creation 12.50%, lead visit 11.67%; conversion and active carpenter 0%','',DEFAULT_ASM_FB,{eu:6,lcA:12.5,lvA:11.67,convA:0,carpA:0}],
 ['784','Md. Faijul Islam-16154','Sibganj Chapai',1.67,1,24.05,38,'No end user visits; lead creation 8.33%; no lead visits','',DEFAULT_ASM_FB,{eu:0,lcA:8.33,lvA:0,convA:0,carpA:0}],
 ['958','Md. Arafat Islam-019207','Godagari',1.33,1,21.14,39,'No end user visits; lead creation 6.67%; no lead visits','',DEFAULT_ASM_FB,{eu:0,lcA:6.67,lvA:0,convA:0,carpA:0}],
].map(([id,name,loc,ach,kpi,pach,pkpi,low,emp,asmfb,m])=>({id,name,loc,ach,kpi,pach,pkpi,low,lowEdited:true,emp,asmfb,m}));
