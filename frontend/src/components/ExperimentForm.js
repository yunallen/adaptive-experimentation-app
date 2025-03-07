import React, { useState } from 'react';
import { Card, Button, Form, Select, Input, InputNumber, Row, Col, Switch, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';

const { Option } = Select;

const ExperimentForm = ({ onCreateExperiment }) => {
  const [form] = Form.useForm();
  const [parameters, setParameters] = useState([]);
  const [objectives, setObjectives] = useState([
    { id: Date.now(), name: '', minimize: false }
  ]);

  const addParameter = () => {
    setParameters([
      ...parameters,
      { id: Date.now(), name: '', type: 'range', bounds: [0, 1], values: [], value: null }
    ]);
  };

  const removeParameter = (paramId) => {
    setParameters(parameters.filter(p => p.id !== paramId));
  };

  const addObjective = () => {
    setObjectives([
      ...objectives,
      { id: Date.now(), name: '', minimize: false }
    ]);
  };

  const removeObjective = (objId) => {
    if (objectives.length <= 1) {
      return; // Keep at least one objective
    }
    setObjectives(objectives.filter(o => o.id !== objId));
  };

  const handleTypeChange = (type, paramId) => {
    setParameters(parameters.map(p => 
      p.id === paramId ? { ...p, type } : p
    ));
  };

  const handleObjectiveMinimizeChange = (minimize, objId) => {
    setObjectives(objectives.map(o => 
      o.id === objId ? { ...o, minimize } : o
    ));
  };

  const handleFormSubmit = (values) => {
    console.log("Form values:", values);
    
    // Check if we have at least one parameter
    if (parameters.length === 0) {
      console.error("No parameters defined");
      alert("Please add at least one parameter before creating the experiment");
      return;
    }
    
    // Transform parameters
    const formattedParams = parameters.map(param => {
      console.log(`Formatting parameter ${param.id}:`, param);
      return {
        name: values[`param_${param.id}_name`] || '',
        type: param.type,
        ...(param.type === 'range' ? { 
          bounds: [
            values[`param_${param.id}_min`] !== undefined ? values[`param_${param.id}_min`] : 0, 
            values[`param_${param.id}_max`] !== undefined ? values[`param_${param.id}_max`] : 1
          ] 
        } : {}),
        ...(param.type === 'choice' ? { 
          values: (values[`param_${param.id}_choices`] || '').split(',').map(c => c.trim()) 
        } : {}),
        ...(param.type === 'fixed' ? { 
          value: values[`param_${param.id}_value`] || '' 
        } : {}),
      };
    });
  
    // Transform objectives
    const formattedObjectives = objectives.map(obj => {
      console.log(`Formatting objective ${obj.id}:`, obj);
      return {
        name: values[`objective_${obj.id}_name`] || '',
        minimize: objectives.find(o => o.id === obj.id).minimize
      };
    });
  
    // Create the experiment data
    const experimentData = {
      name: values.experimentName || 'New Experiment',
      parameters: formattedParams,
      objectives: formattedObjectives,
      primary_objective: formattedObjectives.length > 0 ? formattedObjectives[0].name : null
    };
  
    console.log("Submitting experiment data:", experimentData);
    
    // Call the onCreateExperiment function from props
    try {
      onCreateExperiment(experimentData);
    } catch (error) {
      console.error("Error in onCreateExperiment:", error);
      alert("An error occurred while creating the experiment");
    }
  };

  return (
    <Card title="Define Your Experiment">
      <Form 
        form={form}
        layout="vertical"
        onFinish={handleFormSubmit}
      >
        <Form.Item 
          name="experimentName" 
          label="Experiment Name"
          rules={[{ required: true, message: 'Please name your experiment' }]}
        >
          <Input placeholder="E.g., Catalyst Optimization" />
        </Form.Item>
        
        {/* Objectives Section */}
        <Divider orientation="left">Objectives to Optimize</Divider>
        <div className="objectives-section">
          {objectives.map((objective, index) => (
            <Card 
              key={objective.id} 
              size="small" 
              style={{ marginBottom: 16 }}
              extra={
                objectives.length > 1 ? (
                  <Button 
                    icon={<DeleteOutlined />} 
                    onClick={() => removeObjective(objective.id)}
                    danger
                    type="text"
                  />
                ) : null
              }
            >
              <Row gutter={16}>
                <Col span={16}>
                  <Form.Item 
                    name={`objective_${objective.id}_name`}
                    label={`Objective ${index + 1} Name`}
                    rules={[{ required: true, message: 'Objective name required' }]}
                  >
                    <Input placeholder="E.g., Yield, Cost, Purity" />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="Direction">
                    <Switch
                      checkedChildren="Minimize"
                      unCheckedChildren="Maximize"
                      checked={objective.minimize}
                      onChange={(checked) => handleObjectiveMinimizeChange(checked, objective.id)}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          ))}
          
          <Button 
            type="dashed" 
            onClick={addObjective} 
            block 
            icon={<PlusOutlined />}
            style={{ marginBottom: 24 }}
          >
            Add Objective
          </Button>
        </div>
        
        {/* Parameters Section */}
        <Divider orientation="left">Parameters to Search</Divider>
        <div className="parameters-section">
          {parameters.map(param => (
            <Card 
              key={param.id} 
              size="small" 
              style={{ marginBottom: 16 }}
              extra={
                <Button 
                  icon={<DeleteOutlined />} 
                  onClick={() => removeParameter(param.id)}
                  danger
                  type="text"
                />
              }
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item 
                    name={`param_${param.id}_name`}
                    label="Parameter Name"
                    rules={[{ required: true, message: 'Name required' }]}
                  >
                    <Input placeholder="E.g., Temperature" />
                  </Form.Item>
                </Col>
                
                <Col span={8}>
                  <Form.Item label="Parameter Type">
                    <Select 
                      value={param.type} 
                      onChange={(value) => handleTypeChange(value, param.id)}
                    >
                      <Option value="range">Range</Option>
                      <Option value="choice">Choice</Option>
                      <Option value="fixed">Fixed</Option>
                    </Select>
                  </Form.Item>
                </Col>
                
                <Col span={8}>
                  {param.type === 'range' && (
                    <Form.Item label="Range Bounds">
                      <Input.Group compact>
                        <Form.Item 
                          name={`param_${param.id}_min`}
                          noStyle
                          rules={[{ required: true, message: 'Required' }]}
                        >
                          <InputNumber style={{ width: 100 }} placeholder="Min" />
                        </Form.Item>
                        <Input 
                          style={{ width: 30, borderLeft: 0, borderRight: 0, pointerEvents: 'none' }}
                          placeholder="~"
                          disabled
                        />
                        <Form.Item 
                          name={`param_${param.id}_max`}
                          noStyle
                          rules={[{ required: true, message: 'Required' }]}
                        >
                          <InputNumber style={{ width: 100 }} placeholder="Max" />
                        </Form.Item>
                      </Input.Group>
                    </Form.Item>
                  )}
                  
                  {param.type === 'choice' && (
                    <Form.Item 
                      name={`param_${param.id}_choices`}
                      label="Possible Values"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input placeholder="E.g., water,ethanol,acetone" />
                    </Form.Item>
                  )}
                  
                  {param.type === 'fixed' && (
                    <Form.Item 
                      name={`param_${param.id}_value`}
                      label="Fixed Value"
                      rules={[{ required: true, message: 'Required' }]}
                    >
                      <Input placeholder="E.g., 25" />
                    </Form.Item>
                  )}
                </Col>
              </Row>
            </Card>
          ))}
          
          <Button 
            type="dashed" 
            onClick={addParameter} 
            block 
            icon={<PlusOutlined />}
          >
            Add Parameter
          </Button>
        </div>
        
        <Form.Item style={{ marginTop: 24 }}>
          <Button 
            type="primary" 
            htmlType="submit"
            disabled={parameters.length === 0 || objectives.length === 0}
          >
            Create Experiment
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default ExperimentForm;