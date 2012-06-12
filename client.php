<?php

$url = 'http://localhost:1337/';

$json = json_decode(file_get_contents($url), true);

$data = '';
foreach ($json['data'] as $item) {
    $data .= base64_decode($item);
}
$json['data'] = $data;

var_dump($json);
die;
/*
$chunk_size = 10; // this can be lower or greater than server chunk size
$handle = fopen($url, 'r');
//stream_set_timeout($handle, 1000000);
//stream_set_blocking($handle, 0);
while (true) {
    $output = fread($handle, $chunk_size);
    echo($output);
    if (strlen($output) == 0)
        break;
}
fclose($handle);
*/
?>
