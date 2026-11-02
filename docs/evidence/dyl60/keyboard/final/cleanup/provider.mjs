import { createServer } from 'node:http';

export const shortAnswer = '*The lantern glows.*\n\n"Welcome to the reading room," **Mira** says.\n\n- Read a complete reply\n- Keep the original composer\n\n`a quiet moment`';
export const longAnswer = '# The reading room\n\n' + shortAnswer + '\n\n```js\nconst lantern = "warm";\n```\n\n[Reading reference](https://example.com/story)\n\n' + Array.from({length:65},(_,i)=>`Paragraph ${i+1}. The shelves hold quiet stories. The entire message remains selectable, and the reader can pause here without losing the conversation.`).join('\n\n') + '\n\nEND OF COMPLETE SYNTHETIC REPLY';

const server = createServer(async (req,res) => {
    const origin=req.headers.origin;
    if (origin && origin !== 'http://127.0.0.1:37027') {res.writeHead(403).end();return;}
    res.setHeader('Access-Control-Allow-Origin','http://127.0.0.1:37027');
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    if (req.method==='OPTIONS') {res.writeHead(204).end();return;}
    if (req.url==='/v1/models') {res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({data:[{id:'sn-reader-local',object:'model'}]}));return;}
    if (req.url!=='/v1/chat/completions' || req.method!=='POST') {res.writeHead(404).end();return;}
    let raw='';
    for await (const part of req) {raw+=part;if (Buffer.byteLength(raw)>1024*1024) {res.writeHead(413).end();return;}}
    let body;
    try {body=JSON.parse(raw);} catch {res.writeHead(400).end();return;}
    const lastUser=body.messages?.findLast(item=>item.role==='user')?.content || '';
    const content=JSON.stringify(lastUser).includes('[LONG]') ? longAnswer : shortAnswer;
    console.log('synthetic request: '+(body.stream ? 'streaming' : 'normal')+', reply chars='+content.length);
    const base={id:'sn-reader-local',created:1,model:'sn-reader-local'};
    if (!body.stream) {res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({...base,object:'chat.completion',choices:[{index:0,message:{role:'assistant',content},finish_reason:'stop'}]}));return;}
    res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache'});
    const size=JSON.stringify(lastUser).includes('[LONG]') ? 180 : 10;
    for (let offset=0;offset<content.length;offset+=size) {
        if (res.destroyed) return;
        res.write('data: '+JSON.stringify({...base,object:'chat.completion.chunk',choices:[{index:0,delta:{content:content.slice(offset,offset+size)},finish_reason:null}]})+'\n\n');
        await new Promise(resolve=>setTimeout(resolve,200));
    }
    if (!res.destroyed) res.end('data: '+JSON.stringify({...base,object:'chat.completion.chunk',choices:[{index:0,delta:{},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n');
});
if (process.argv[1] === new URL(import.meta.url).pathname) server.listen(8128,'127.0.0.1',()=>console.log('deterministic reader endpoint listening on 8128'));
